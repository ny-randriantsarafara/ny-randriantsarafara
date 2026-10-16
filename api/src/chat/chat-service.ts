import { randomUUID } from 'node:crypto';
import {
  CHAT_CLIENT_TIMEOUT_MILLISECONDS,
  chatRequestSchema,
  degradedReply,
  unavailableReply,
  type ChatRequest,
  type ChatResponse,
  type ChatReply,
} from '@portfolio/chat';
import type { ActivePublication, Locale } from '@portfolio/content';

import type { BudgetReservationResult, MonthlyBudgetGate } from '../budget/monthly-budget.ts';
import type {
  ModelSettings,
  ModelSettingsStatus,
  ResolvedModelProfile,
} from '../model-settings/model-settings.ts';
import { checkGlobalModelDailyLimit, checkVisitorChatLimits } from '../rate-limit/chat-limits.ts';
import type { MemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import type { ChatModel, ChatModelRequest, ChatModelResult } from './chat-model.ts';
import type { ModelProviderRegistry } from './model-provider.ts';
import { computeModelCostEur, estimateReservationEur } from './cost.ts';
import type { ExchangeRecorder } from './exchange-recorder.ts';
import { buildConversationPrompt, replyLanguageForRequest } from './prompt-builder.ts';
import { validateAndNormalizeModelReply } from './model-reply.ts';
import { createPublicationContextCache } from './publication-context.ts';
import { requestedUtility } from './requested-utility.ts';
import {
  createResponseCoordinator,
  createResponseKey,
  type GenerationDecision,
  type CoordinatedDecision,
} from './response-coordinator.ts';
import type { ScriptedMatcherCache } from './scripted-matcher-cache.ts';

// A reply later than this reaches a site that has stopped waiting, yet is still billed.
const REPLY_DEADLINE_MILLISECONDS = CHAT_CLIENT_TIMEOUT_MILLISECONDS - 1_000;
// Kept after the model call for the publication checks and the response.
const POST_MODEL_MILLISECONDS = 500;
const MIN_MODEL_MILLISECONDS = 1_000;

// Outputs the server refused because the published evidence does not support them.
const REJECTED_OUTPUT_REASONS = [
  'model_invalid_evidence',
  'model_unknown_identifier',
  'model_unsupported_claims',
];

export type ModelModeDependencies = {
  model?: ChatModel;
  registry?: ModelProviderRegistry;
  readSettings: () => Promise<ModelSettingsStatus>;
  dailyCallLimit: number;
};
export type ChatServiceDependencies = {
  readActivePublication: () => Promise<ActivePublication | null>;
  matcherCache: ScriptedMatcherCache;
  modelMode: ModelModeDependencies | null;
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
  priorVisitorTexts: readonly string[];
  startedAt: number;
  locale: Locale;
};

export function createChatService(dependencies: ChatServiceDependencies): ChatService {
  const contexts = createPublicationContextCache();
  const coordinator = createResponseCoordinator(dependencies.clock);

  async function stillActive(exchange: ExchangeContext): Promise<boolean> {
    return (
      (await dependencies.readActivePublication())?.publicationId === exchange.active.publicationId
    );
  }

  async function deliver(
    exchange: ExchangeContext,
    reply: ChatReply,
    mode: ChatResponse['mode'],
    coordinated: CoordinatedDecision,
    modelName: string | null,
    cacheKey?: string
  ): Promise<{ status: number; body: ChatResponse | { error: string } }> {
    const current = await stillActive(exchange);
    if (!current && cacheKey !== undefined) coordinator.discard(cacheKey);
    const { decision, source } = coordinated;
    const inferred = source === 'provider';
    const shared = source === 'cache' || source === 'shared';
    const usage = inferred ? decision.usage : null;
    const reason = current
      ? decision.status === 'fallback'
        ? decision.reason
        : null
      : 'publication_changed';
    void dependencies.exchangeRecorder.record({
      locale: exchange.locale,
      conversationId: exchange.request.conversationId,
      question: exchange.question,
      mode,
      outcome: reply.outcome,
      answerSlugs: current ? reply.answerSlugs : [],
      blocks: current ? reply.blocks : [],
      latencyMs: dependencies.clock().getTime() - exchange.startedAt,
      model: decision.generationId !== null ? modelName : null,
      generationId: decision.generationId,
      servedModel: decision.servedModel ?? null,
      inputTokens: shared ? 0 : (usage?.inputTokens ?? null),
      outputTokens: shared ? 0 : (usage?.outputTokens ?? null),
      cacheReadTokens: shared ? 0 : (usage?.cacheReadTokens ?? null),
      cacheWriteTokens: shared ? 0 : (usage?.cacheWriteTokens ?? null),
      reasoningTokens: shared ? 0 : (usage?.reasoningTokens ?? null),
      costEur: shared ? 0 : decision.costEur,
      providerCostUsd: shared ? 0 : (decision.providerCostUsd ?? null),
      deliverySource: source === 'rejected' ? 'scripted' : source,
      failureReason: reason,
      publicationId: exchange.active.publicationId,
    });
    if (!current || reason === 'publication_changed')
      return { status: 503, body: { error: 'unavailable' } };
    return { status: 200, body: { mode, publicationId: exchange.active.publicationId, reply } };
  }

  function scripted(exchange: ExchangeContext, reply: ChatReply, reason: string | null) {
    // No generation happened; the explicit disabled path retains the curated matcher.
    return deliver(
      exchange,
      reply,
      'scripted',
      { source: 'rejected', decision: fallback(reason, null) },
      null
    );
  }

  async function reasonToSkipModel(exchange: ExchangeContext): Promise<string | null> {
    if (!(await stillActive(exchange))) return 'publication_changed';
    const modelMode = dependencies.modelMode;
    if (modelMode === null) return 'model_disabled';
    const withinDailyLimit = checkGlobalModelDailyLimit(
      dependencies.rateLimiter,
      dependencies.clock,
      modelMode.dailyCallLimit,
      dependencies.clock().getTime()
    );
    if (!withinDailyLimit) return 'model_daily_limit';
    return null;
  }

  // The provider wait ends before the site gives up, whatever the configured timeout.
  function modelTimeoutMilliseconds(
    exchange: ExchangeContext,
    settings: ModelSettings
  ): number | null {
    const elapsed = dependencies.clock().getTime() - exchange.startedAt;
    const remaining = REPLY_DEADLINE_MILLISECONDS - POST_MODEL_MILLISECONDS - elapsed;
    if (remaining < MIN_MODEL_MILLISECONDS) return null;
    return Math.min(settings.timeoutMilliseconds, remaining);
  }

  async function generate(
    exchange: ExchangeContext,
    settings: ModelSettings,
    model: ChatModel
  ): Promise<GenerationDecision> {
    const context = contexts.get(exchange.active, exchange.locale);
    const prompt = buildConversationPrompt(exchange.request);
    const inputBytes =
      Buffer.byteLength(context.instructions) +
      Buffer.byteLength(prompt) +
      Buffer.byteLength(JSON.stringify(context.outputSchema));
    if (inputBytes > (settings.maxInputBytes ?? 65536))
      return fallback('model_context_limit', null);
    const reserved = await dependencies.budgetGate.reserve(
      estimateReservationEur(settings, inputBytes)
    );
    if (reserved.status !== 'reserved') return fallback(budgetFailureReason(reserved), null);
    const { reservation } = reserved;
    const skipped = await reasonToSkipModel(exchange);
    if (skipped !== null) {
      reservation.cancel();
      return fallback(skipped, null);
    }
    const timeoutMilliseconds = modelTimeoutMilliseconds(exchange, settings);
    if (timeoutMilliseconds === null) {
      reservation.cancel();
      return fallback('reply_deadline', null);
    }
    const generationId = randomUUID();
    const result = await completeOrNull(model, {
      instructions: context.instructions,
      prompt,
      sessionId: exchange.request.conversationId,
      outputSchema: context.outputSchema,
      modelName: settings.modelName,
      reasoningEffort: settings.reasoningEffort,
      timeoutMilliseconds,
      ...(settings.maxOutputTokens == null ? {} : { maxOutputTokens: settings.maxOutputTokens }),
    });
    if (result === null) {
      reservation.settle(null);
      return fallback('model_error', null);
    }
    const usage = 'usage' in result ? result.usage : null;
    const spend = usage === null ? null : computeModelCostEur(settings, usage);
    reservation.settle(spend);
    const metadata = {
      generationId,
      usage,
      costEur: spend,
      ...('servedModel' in result && result.servedModel !== undefined
        ? { servedModel: result.servedModel }
        : {}),
      ...('providerCostUsd' in result ? { providerCostUsd: result.providerCostUsd } : {}),
    };
    if (!(await stillActive(exchange)))
      return { status: 'fallback', reason: 'publication_changed', ...metadata };
    if (result.status !== 'ok')
      return { status: 'fallback', reason: modelFailureReason(result), ...metadata };
    const questionFocus = dependencies.matcherCache
      .matcherFor(exchange.active.publicationId, exchange.active.content)
      .blockFocus(exchange.question, exchange.locale, {
        priorVisitorTexts: exchange.priorVisitorTexts,
      });
    const validated = validateAndNormalizeModelReply(
      result.output,
      exchange.active.content,
      exchange.locale,
      {
        evidenceSources: context.evidenceSources,
        entityCatalog: context.entityCatalog,
        questionFocus,
      }
    );
    if (validated.status === 'unsupported_claims')
      return {
        status: 'fallback',
        reason: `model_unsupported_claims:${validated.problems.join(',')}`,
        ...metadata,
      };
    if (validated.status !== 'ok')
      return { status: 'fallback', reason: `model_${validated.status}`, ...metadata };
    return { status: 'completed', reply: validated.reply, ...metadata };
  }

  return {
    async handle(body, visitorKey) {
      const startedAt = dependencies.clock().getTime();
      const parsed = chatRequestSchema.safeParse(body);
      if (!parsed.success) return { status: 400, body: { error: 'invalid_request' } };
      const active = await dependencies.readActivePublication();
      if (active === null) return { status: 503, body: { error: 'unavailable' } };
      const request = parsed.data;
      const last = request.messages.at(-1);
      if (last === undefined) return { status: 400, body: { error: 'invalid_request' } };
      const locale = replyLanguageForRequest(request);
      const priorVisitorTexts = request.messages
        .slice(0, -1)
        .filter((message) => message.role === 'visitor')
        .map((message) => message.text);
      const exchange: ExchangeContext = {
        active,
        request,
        question: last.text,
        priorVisitorTexts,
        startedAt,
        locale,
      };
      if (checkVisitorChatLimits(dependencies.rateLimiter, visitorKey, startedAt).visitorExceeded)
        return scripted(exchange, unavailableReply(active.content, locale), 'rate_limited');
      const scriptedReply = dependencies.matcherCache
        .matcherFor(active.publicationId, active.content)
        .reply(last.text, locale, { priorVisitorTexts }).reply;
      const degraded = degradedReply(scriptedReply, active.content, locale);
      if (scriptedReply.outcome === 'sensitive') return scripted(exchange, scriptedReply, null);
      const utility = requestedUtility(request);
      if (utility !== null)
        return scripted(
          exchange,
          {
            outcome: 'answered',
            text:
              utility === 'cv'
                ? locale === 'fr'
                  ? 'Voici mon CV.'
                  : 'Here is my CV.'
                : locale === 'fr'
                  ? 'Voici comment me contacter.'
                  : 'Here is how to contact me.',
            answerSlugs: [],
            blocks: [{ type: utility }],
            suggestions: [],
          },
          null
        );
      const { modelMode } = dependencies;
      if (modelMode === null) return scripted(exchange, scriptedReply, 'model_disabled');
      const status = await modelMode.readSettings();
      if (status.status === 'disabled')
        return scripted(exchange, scriptedReply, modelSettingsFailureReason(status.status));
      if (status.status !== 'configured')
        return scripted(exchange, degraded, modelSettingsFailureReason(status.status));
      const settings = status.settings;
      const model = selectModel(modelMode, settings);
      if (model === null) return scripted(exchange, degraded, 'model_provider_unavailable');
      const context = contexts.get(active, locale);
      const cacheEnabled = settings.responseCacheEnabled === true;
      const key = cacheEnabled
        ? createResponseKey({
            publicationId: active.publicationId,
            locale,
            request,
            providerIdentity: settings.configurationFingerprint ?? 'legacy',
            settings,
            contractVersion: context.contractVersion,
          })
        : randomUUID();
      const coordinated = await coordinator.resolve(
        key,
        () => generate(exchange, settings, model),
        cacheEnabled
      );
      if (coordinated.decision.status === 'completed')
        return deliver(
          exchange,
          coordinated.decision.reply,
          'model',
          coordinated,
          settings.modelName,
          key
        );
      const reply = isRejectedModelOutput(coordinated.decision.reason) ? scriptedReply : degraded;
      return deliver(exchange, reply, 'scripted', coordinated, settings.modelName, key);
    },
  };
}

// A model that throws instead of reporting a failure may still have been billed.
async function completeOrNull(
  model: ChatModel,
  request: ChatModelRequest
): Promise<ChatModelResult | null> {
  try {
    return await model.complete(request);
  } catch {
    return null;
  }
}

function selectModel(
  mode: ModelModeDependencies,
  settings: ModelSettings & Partial<ResolvedModelProfile>
): ChatModel | null {
  if (settings.configurationSource === 'profile')
    return mode.registry?.forProfile(settings) ?? null;
  return mode.model ?? null;
}
function fallback(reason: string | null, usage: GenerationDecision['usage']): GenerationDecision {
  return { status: 'fallback', reason, usage, generationId: null, costEur: null };
}
function modelSettingsFailureReason(
  status: Exclude<ModelSettingsStatus['status'], 'configured'>
): string {
  return status === 'disabled'
    ? 'model_disabled'
    : status === 'invalid'
      ? 'model_settings_invalid'
      : 'model_settings_unavailable';
}
function budgetFailureReason(
  result: Exclude<BudgetReservationResult, { status: 'reserved' }>
): string {
  if (result.status === 'exhausted') return 'budget_exhausted';
  return 'budget_unavailable';
}
function isRejectedModelOutput(reason: string | null): boolean {
  if (reason === null) return false;
  return REJECTED_OUTPUT_REASONS.some((prefix) => reason.startsWith(prefix));
}
function modelFailureReason(result: Exclude<ChatModelResult, { status: 'ok' }>): string {
  if (result.status === 'http') return `model_http_${result.statusCode ?? 0}`;
  return `model_${result.status}`;
}
