import { chatRequestSchema, type ChatRequest, type ChatResponse } from '@portfolio/chat';
import { detectReplyLanguage } from '@portfolio/chat';
import type { ActivePublication } from '@portfolio/content';

import type { MonthlyBudgetGate, MonthlyBudgetStatus } from '../budget/monthly-budget.ts';
import type { ModelConfiguration } from '../environment.ts';
import { checkGlobalModelDailyLimit, checkVisitorChatLimits } from '../rate-limit/chat-limits.ts';
import type { MemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { parisDayKey } from '../time/paris-calendar.ts';
import type { ChatModel, ChatModelResult } from './chat-model.ts';
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
  const active = await dependencies.readActivePublication();
  if (active === null) {
    return { status: 503, body: { error: 'unavailable' } };
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid_request' } };
  }
  const request = parsed.data;
  const question = readLastVisitorMessage(request);
  const matcher = dependencies.matcherCache.matcherFor(active.publicationId, active.content);
  const guardrail = matcher.reply(question, request.locale);
  if (guardrail.reply.outcome === 'sensitive') {
    return respondScripted(
      active,
      request,
      question,
      guardrail.reply,
      null,
      startedAt,
      dependencies
    );
  }

  const chatLimits = checkVisitorChatLimits(
    dependencies.rateLimiter,
    visitorKey,
    dependencies.clock().getTime()
  );
  if (chatLimits.visitorExceeded) {
    const scripted = matcher.reply(question, request.locale);
    return respondScripted(
      active,
      request,
      question,
      scripted.reply,
      'rate_limited',
      startedAt,
      dependencies
    );
  }

  const modelDecision = await evaluateModelPath(request, question, active, dependencies);
  if (modelDecision.kind === 'model') {
    return modelDecision.response;
  }

  const scripted = matcher.reply(question, request.locale);
  return respondScripted(
    active,
    request,
    question,
    scripted.reply,
    modelDecision.failureReason,
    startedAt,
    dependencies
  );
}

type ModelDecision =
  | { kind: 'model'; response: { status: number; body: ChatResponse } }
  | { kind: 'scripted'; failureReason: string };

async function evaluateModelPath(
  request: ChatRequest,
  question: string,
  active: ActivePublication,
  dependencies: ChatServiceDependencies
): Promise<ModelDecision> {
  if (dependencies.model === null || dependencies.modelConfiguration === null) {
    return { kind: 'scripted', failureReason: 'model_disabled' };
  }
  const budgetStatus = await dependencies.budgetGate.readStatus();
  const budgetReason = budgetFailureReason(budgetStatus);
  if (budgetReason !== null) {
    return { kind: 'scripted', failureReason: budgetReason };
  }
  const dayKey = parisDayKey(dependencies.clock);
  const modelAllowed = checkGlobalModelDailyLimit(
    dependencies.rateLimiter,
    dayKey,
    dependencies.modelConfiguration.dailyCallLimit,
    dependencies.clock().getTime()
  );
  if (!modelAllowed) {
    return { kind: 'scripted', failureReason: 'model_daily_limit' };
  }

  const startedAt = dependencies.clock().getTime();
  const prompt = buildChatPrompt(request, active.content);
  const modelResult = await dependencies.model.complete(prompt);
  const failureReason = modelFailureReason(modelResult);
  if (failureReason !== null) {
    return { kind: 'scripted', failureReason };
  }
  if (modelResult.status !== 'ok') {
    return { kind: 'scripted', failureReason: 'model_invalid_output' };
  }

  const replyLanguage = detectReplyLanguage(question, request.locale);
  const validated = validateAndNormalizeModelReply(
    modelResult.output,
    active.content,
    replyLanguage
  );
  if (validated.status === 'invalid_output') {
    return { kind: 'scripted', failureReason: 'model_invalid_output' };
  }
  if (validated.status === 'unknown_identifier') {
    return { kind: 'scripted', failureReason: 'model_unknown_identifier' };
  }

  const latencyMs = dependencies.clock().getTime() - startedAt;
  const costEur = computeModelCostEur(
    dependencies.modelConfiguration,
    modelResult.usage.inputTokens,
    modelResult.usage.outputTokens
  );
  await dependencies.exchangeRecorder.record({
    locale: request.locale,
    conversationId: request.conversationId,
    question,
    mode: 'model',
    outcome: validated.reply.outcome,
    answerSlugs: validated.reply.answerSlugs,
    blocks: validated.reply.blocks,
    latencyMs,
    model: dependencies.modelConfiguration.modelName,
    inputTokens: modelResult.usage.inputTokens,
    outputTokens: modelResult.usage.outputTokens,
    costEur,
    failureReason: null,
    publicationId: active.publicationId,
  });

  return {
    kind: 'model',
    response: {
      status: 200,
      body: {
        mode: 'model',
        publicationId: active.publicationId,
        reply: validated.reply,
      },
    },
  };
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

function modelFailureReason(result: ChatModelResult): string | null {
  if (result.status === 'timeout') {
    return 'model_timeout';
  }
  if (result.status === 'http') {
    return `model_http_${result.statusCode ?? 0}`;
  }
  if (result.status === 'network') {
    return 'model_network';
  }
  return null;
}

function respondScripted(
  active: ActivePublication,
  request: ChatRequest,
  question: string,
  reply: ChatResponse['reply'],
  failureReason: string | null,
  startedAt: number,
  dependencies: ChatServiceDependencies
): { status: number; body: ChatResponse } {
  const latencyMs = dependencies.clock().getTime() - startedAt;
  void dependencies.exchangeRecorder.record({
    locale: request.locale,
    conversationId: request.conversationId,
    question,
    mode: 'scripted',
    outcome: reply.outcome,
    answerSlugs: reply.answerSlugs,
    blocks: reply.blocks,
    latencyMs,
    model: null,
    inputTokens: null,
    outputTokens: null,
    costEur: null,
    failureReason,
    publicationId: active.publicationId,
  });
  return {
    status: 200,
    body: {
      mode: 'scripted',
      publicationId: active.publicationId,
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
