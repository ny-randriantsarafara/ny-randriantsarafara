import { chatRequestSchema, type ChatRequest, type ChatResponse } from '@portfolio/chat';
import { detectReplyLanguage } from '@portfolio/chat';
import type { ActivePublication } from '@portfolio/content';

import type { MonthlyBudgetGate, MonthlyBudgetStatus } from '../budget/monthly-budget.ts';
import type { ModelConfiguration } from '../environment.ts';
import { checkGlobalModelDailyLimit, checkVisitorChatLimits } from '../rate-limit/chat-limits.ts';
import type { MemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import type { ChatModel, ChatModelFailure, ChatModelSuccess } from './chat-model.ts';
import { computeModelCostEur } from './cost.ts';
import type { ExchangeRecorder } from './exchange-recorder.ts';
import { buildChatPrompt } from './prompt-builder.ts';
import { validateAndNormalizeModelReply } from './model-reply.ts';
import type { ScriptedMatcherCache } from './scripted-matcher-cache.ts';

export type ChatServiceDependencies = {
  readActivePublication: () => Promise<ActivePublication | null>;
  matcherCache: ScriptedMatcherCache;
  model: ChatModel | null;
  modelConfiguration: ModelConfiguration | null;
  budgetGate: MonthlyBudgetGate;
  rateLimiter: MemoryRateLimiter;
  exchangeRecorder: ExchangeRecorder;
  clock: () => Date;
};

export type ChatService = {
  handle(
    body: unknown,
    visitorKey: string
  ): Promise<{ status: number; body: ChatResponse | { error: string } }>;
};

type ExchangeContext = {
  active: ActivePublication;
  request: ChatRequest;
  question: string;
  startedAt: number;
};

type ModelSpend = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
};

type ScriptedFallback = {
  failureReason: string | null;
  spend: ModelSpend | null;
};

type ModelDecision =
  | { kind: 'model'; response: { status: number; body: ChatResponse } }
  | { kind: 'scripted'; fallback: ScriptedFallback };

export function createChatService(dependencies: ChatServiceDependencies): ChatService {
  return {
    handle: (body, visitorKey) => handleChat(body, visitorKey, dependencies),
  };
}

async function handleChat(
  body: unknown,
  visitorKey: string,
  dependencies: ChatServiceDependencies
): Promise<{ status: number; body: ChatResponse | { error: string } }> {
  const startedAt = dependencies.clock().getTime();
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid_request' } };
  }
  const active = await dependencies.readActivePublication();
  if (active === null) {
    return { status: 503, body: { error: 'unavailable' } };
  }
  const request = parsed.data;
  const question = readLastVisitorMessage(request);
  const exchange: ExchangeContext = { active, request, question, startedAt };
  const scriptedReply = dependencies.matcherCache
    .matcherFor(active.publicationId, active.content)
    .reply(question, request.locale).reply;

  const chatLimits = checkVisitorChatLimits(dependencies.rateLimiter, visitorKey, startedAt);
  if (chatLimits.visitorExceeded) {
    const fallback = { failureReason: 'rate_limited', spend: null };
    return respondScripted(exchange, scriptedReply, fallback, dependencies);
  }
  if (scriptedReply.outcome === 'sensitive') {
    const fallback = { failureReason: null, spend: null };
    return respondScripted(exchange, scriptedReply, fallback, dependencies);
  }

  const modelDecision = await evaluateModelPath(exchange, dependencies);
  if (modelDecision.kind === 'model') {
    return modelDecision.response;
  }
  return respondScripted(exchange, scriptedReply, modelDecision.fallback, dependencies);
}

async function evaluateModelPath(
  exchange: ExchangeContext,
  dependencies: ChatServiceDependencies
): Promise<ModelDecision> {
  const { model, modelConfiguration } = dependencies;
  if (model === null || modelConfiguration === null) {
    return scriptedDecision('model_disabled', null);
  }
  const budgetReason = budgetFailureReason(await dependencies.budgetGate.readStatus());
  if (budgetReason !== null) {
    return scriptedDecision(budgetReason, null);
  }
  const modelAllowed = checkGlobalModelDailyLimit(
    dependencies.rateLimiter,
    dependencies.clock,
    modelConfiguration.dailyCallLimit,
    dependencies.clock().getTime()
  );
  if (!modelAllowed) {
    return scriptedDecision('model_daily_limit', null);
  }

  const modelResult = await model.complete(
    buildChatPrompt(exchange.request, exchange.active.content)
  );
  if (modelResult.status !== 'ok') {
    return scriptedDecision(modelFailureReason(modelResult), null);
  }
  return decideFromModelOutput(exchange, modelResult, modelConfiguration, dependencies);
}

// Tokens are billed even when the output is rejected, so the spend is recorded either way.
function decideFromModelOutput(
  exchange: ExchangeContext,
  modelResult: ChatModelSuccess,
  modelConfiguration: ModelConfiguration,
  dependencies: ChatServiceDependencies
): ModelDecision {
  const spend: ModelSpend = {
    model: modelConfiguration.modelName,
    inputTokens: modelResult.usage.inputTokens,
    outputTokens: modelResult.usage.outputTokens,
    costEur: computeModelCostEur(
      modelConfiguration,
      modelResult.usage.inputTokens,
      modelResult.usage.outputTokens
    ),
  };
  const replyLanguage = detectReplyLanguage(exchange.question, exchange.request.locale);
  const validated = validateAndNormalizeModelReply(
    modelResult.output,
    exchange.active.content,
    replyLanguage
  );
  if (validated.status === 'invalid_output') {
    return scriptedDecision('model_invalid_output', spend);
  }
  if (validated.status === 'unknown_identifier') {
    return scriptedDecision('model_unknown_identifier', spend);
  }

  void dependencies.exchangeRecorder.record({
    locale: exchange.request.locale,
    conversationId: exchange.request.conversationId,
    question: exchange.question,
    mode: 'model',
    outcome: validated.reply.outcome,
    answerSlugs: validated.reply.answerSlugs,
    blocks: validated.reply.blocks,
    latencyMs: dependencies.clock().getTime() - exchange.startedAt,
    model: spend.model,
    inputTokens: spend.inputTokens,
    outputTokens: spend.outputTokens,
    costEur: spend.costEur,
    failureReason: null,
    publicationId: exchange.active.publicationId,
  });
  return {
    kind: 'model',
    response: {
      status: 200,
      body: {
        mode: 'model',
        publicationId: exchange.active.publicationId,
        reply: validated.reply,
      },
    },
  };
}

function scriptedDecision(failureReason: string, spend: ModelSpend | null): ModelDecision {
  return { kind: 'scripted', fallback: { failureReason, spend } };
}

function budgetFailureReason(status: MonthlyBudgetStatus): string | null {
  if (status === 'exhausted') {
    return 'budget_exhausted';
  }
  if (status === 'unavailable') {
    return 'budget_unavailable';
  }
  return null;
}

function modelFailureReason(result: ChatModelFailure): string {
  if (result.status === 'timeout') {
    return 'model_timeout';
  }
  if (result.status === 'http') {
    return `model_http_${result.statusCode ?? 0}`;
  }
  return 'model_network';
}

function respondScripted(
  exchange: ExchangeContext,
  reply: ChatResponse['reply'],
  fallback: ScriptedFallback,
  dependencies: ChatServiceDependencies
): { status: number; body: ChatResponse } {
  void dependencies.exchangeRecorder.record({
    locale: exchange.request.locale,
    conversationId: exchange.request.conversationId,
    question: exchange.question,
    mode: 'scripted',
    outcome: reply.outcome,
    answerSlugs: reply.answerSlugs,
    blocks: reply.blocks,
    latencyMs: dependencies.clock().getTime() - exchange.startedAt,
    model: fallback.spend?.model ?? null,
    inputTokens: fallback.spend?.inputTokens ?? null,
    outputTokens: fallback.spend?.outputTokens ?? null,
    costEur: fallback.spend?.costEur ?? null,
    failureReason: fallback.failureReason,
    publicationId: exchange.active.publicationId,
  });
  return {
    status: 200,
    body: {
      mode: 'scripted',
      publicationId: exchange.active.publicationId,
      reply,
    },
  };
}

function readLastVisitorMessage(request: ChatRequest): string {
  const last = request.messages.at(-1);
  if (last === undefined) {
    throw new Error('Chat request must include at least one message.');
  }
  return last.text;
}
