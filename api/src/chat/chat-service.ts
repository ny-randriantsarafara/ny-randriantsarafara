import { randomUUID } from 'node:crypto';
import {
  CHAT_CLIENT_TIMEOUT_MILLISECONDS,
  chatRequestSchema,
  contactReplyText,
  cvReplyText,
  degradedReply,
  rejectedOutputReply,
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
import type { ExchangeRecorder, GenerationDiagnostics } from './exchange-recorder.ts';
import type { GenerationRecorder } from './generation-recorder.ts';
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
  legacyProviderId?: string | null;
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
  generationRecorder?: GenerationRecorder;
  clock: () => Date;
};
export type ChatService = {
  recordFailure?(body: unknown, telemetry: ChatTelemetryContext): void;
  handle(
    body: unknown,
    visitorKey: string,
    telemetry?: ChatTelemetryContext
  ): Promise<{ status: number; body: ChatResponse | { error: string } }>;
};
export type ChatTelemetryContext = {
  analyticsExcluded?: boolean;
  deviceClass?: 'mobile' | 'tablet' | 'desktop';
};
type ExchangeContext = {
  id: string;
  analyticsExcluded: boolean;
  visitorHash: string;
  deviceClass: 'mobile' | 'tablet' | 'desktop' | null;
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
    let publicationUnavailable = false;
    const current = await stillActive(exchange).catch(() => {
      publicationUnavailable = true;
      return false;
    });
    if (!current && cacheKey !== undefined) coordinator.discard(cacheKey);
    const { decision, source } = coordinated;
    const inferred = source === 'provider';
    const shared = source === 'cache' || source === 'shared';
    const usage = inferred ? decision.usage : null;
    const reason = current
      ? decision.status === 'fallback'
        ? decision.reason
        : null
      : publicationUnavailable
        ? 'publication_unavailable'
        : 'publication_changed';
    void dependencies.exchangeRecorder.record({
      id: exchange.id,
      receivedAt: new Date(exchange.startedAt).toISOString(),
      analyticsExcluded: exchange.analyticsExcluded,
      visitorHash: exchange.analyticsExcluded ? null : exchange.visitorHash,
      deviceClass: exchange.analyticsExcluded ? null : exchange.deviceClass,
      requestId: exchange.analyticsExcluded ? null : (exchange.request.requestId ?? null),
      journeyId: exchange.analyticsExcluded ? null : (exchange.request.journeyId ?? null),
      locale: exchange.analyticsExcluded ? null : exchange.locale,
      conversationId: exchange.analyticsExcluded ? null : exchange.request.conversationId,
      question: exchange.analyticsExcluded ? null : exchange.question,
      responseText: !current || exchange.analyticsExcluded ? null : reply.text,
      validationStatus: decision.validationStatus ?? 'not_run',
      evidenceReferences: exchange.analyticsExcluded ? [] : (decision.evidenceReferences ?? []),
      providerId: decision.providerId,
      profileId: decision.profileId,
      configurationFingerprint: decision.configurationFingerprint,
      promptVersion: decision.promptVersion,
      inputBytes: decision.inputBytes,
      contextBytes: decision.contextBytes,
      providerDurationMs: decision.providerDurationMs,
      validationDurationMs: decision.validationDurationMs,
      httpStatus: current ? 200 : 503,
      mode,
      outcome: reply.outcome,
      answerSlugs: current && !exchange.analyticsExcluded ? reply.answerSlugs : [],
      blocks: current && !exchange.analyticsExcluded ? reply.blocks : [],
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
    return {
      status: 200,
      body: {
        mode,
        publicationId: exchange.active.publicationId,
        reply,
        ...(exchange.request.requestId === undefined
          ? {}
          : { requestId: exchange.request.requestId }),
      },
    };
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
    const providerStartedAt = dependencies.clock().getTime();
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
    const usage = result !== null && 'usage' in result ? result.usage : null;
    const spend = usage === null ? null : computeModelCostEur(settings, usage);
    reservation.settle(spend);
    const diagnostics: GenerationDiagnostics = {
      providerId:
        settings.configurationSource === 'profile'
          ? (settings.providerId ?? null)
          : (dependencies.modelMode?.legacyProviderId ?? null),
      profileId: settings.profileId ?? null,
      configurationFingerprint: settings.configurationFingerprint ?? null,
      promptVersion: context.contractVersion,
      inputBytes,
      contextBytes:
        Buffer.byteLength(context.instructions) +
        Buffer.byteLength(JSON.stringify(context.outputSchema)),
      providerDurationMs: Math.max(0, dependencies.clock().getTime() - providerStartedAt),
      validationDurationMs: null,
      validationStatus: 'not_run',
      evidenceReferences: [],
    };
    const metadata = {
      generationId,
      usage,
      costEur: spend,
      ...(result !== null && 'servedModel' in result && result.servedModel !== undefined
        ? { servedModel: result.servedModel }
        : {}),
      ...(result !== null && 'providerCostUsd' in result
        ? { providerCostUsd: result.providerCostUsd }
        : {}),
    };
    let decision: GenerationDecision;
    try {
      decision = await decide();
    } catch {
      decision = { status: 'fallback', reason: 'validation_error', ...metadata };
    }
    decision = { ...decision, ...diagnostics };
    void dependencies.generationRecorder?.record({
      ...diagnostics,
      id: generationId,
      receivedAt: new Date(providerStartedAt).toISOString(),
      completedAt: dependencies.clock().toISOString(),
      exchangeId: exchange.id,
      requestId: exchange.analyticsExcluded ? null : (exchange.request.requestId ?? null),
      journeyId: exchange.analyticsExcluded ? null : (exchange.request.journeyId ?? null),
      conversationId: exchange.analyticsExcluded ? null : exchange.request.conversationId,
      analyticsExcluded: exchange.analyticsExcluded,
      publicationId: exchange.active.publicationId,
      evidenceReferences: exchange.analyticsExcluded ? [] : diagnostics.evidenceReferences,
      model: settings.modelName,
      servedModel: metadata.servedModel ?? null,
      status:
        decision.status === 'completed'
          ? 'completed'
          : result?.status === 'ok'
            ? 'rejected'
            : 'error',
      failureReason: decision.status === 'fallback' ? decision.reason : null,
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      cacheReadTokens: usage?.cacheReadTokens ?? null,
      cacheWriteTokens: usage?.cacheWriteTokens ?? null,
      reasoningTokens: usage?.reasoningTokens ?? null,
      costEur: spend,
      providerCostUsd: metadata.providerCostUsd ?? null,
    });
    return decision;

    async function decide(): Promise<GenerationDecision> {
      if (result === null) return { status: 'fallback', reason: 'model_error', ...metadata };
      if (!(await stillActive(exchange)))
        return { status: 'fallback', reason: 'publication_changed', ...metadata };
      if (result.status !== 'ok')
        return { status: 'fallback', reason: modelFailureReason(result), ...metadata };
      const validationStartedAt = dependencies.clock().getTime();
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
          question: exchange.question,
          askedQuestions: [...exchange.priorVisitorTexts, exchange.question],
        }
      );
      diagnostics.validationDurationMs = Math.max(
        0,
        dependencies.clock().getTime() - validationStartedAt
      );
      diagnostics.validationStatus = validated.status;
      diagnostics.evidenceReferences =
        'evidenceReferences' in validated ? validated.evidenceReferences : [];
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
  }

  return {
    recordFailure(body, telemetry) {
      const parsed = chatRequestSchema.safeParse(body);
      recordEarly(
        'operational_error',
        503,
        dependencies.clock().getTime(),
        telemetry.analyticsExcluded === true,
        parsed.success ? parsed.data : undefined
      );
    },
    async handle(body, visitorKey, telemetry = {}) {
      const startedAt = dependencies.clock().getTime();
      try {
        return await handle(body, visitorKey, telemetry, startedAt);
      } catch {
        const parsed = chatRequestSchema.safeParse(body);
        recordEarly(
          'operational_error',
          503,
          startedAt,
          telemetry.analyticsExcluded === true,
          parsed.success ? parsed.data : undefined
        );
        return { status: 503, body: { error: 'unavailable' } };
      }
    },
  };

  function recordEarly(
    reason: string,
    status: number,
    startedAt: number,
    excluded: boolean,
    request?: ChatRequest
  ): void {
    void dependencies.exchangeRecorder.record({
      id: randomUUID(),
      receivedAt: new Date(startedAt).toISOString(),
      analyticsExcluded: excluded,
      locale: excluded ? null : (request?.locale ?? null),
      conversationId: excluded ? null : (request?.conversationId ?? null),
      requestId: excluded ? null : (request?.requestId ?? null),
      journeyId: excluded ? null : (request?.journeyId ?? null),
      question: null,
      responseText: null,
      mode: null,
      outcome: null,
      answerSlugs: [],
      blocks: [],
      latencyMs: Math.max(0, dependencies.clock().getTime() - startedAt),
      model: null,
      inputTokens: null,
      outputTokens: null,
      costEur: null,
      failureReason: reason,
      publicationId: null,
      httpStatus: status,
      validationStatus: 'not_run',
    });
  }
  async function handle(
    body: unknown,
    visitorKey: string,
    telemetry: ChatTelemetryContext,
    startedAt: number
  ): ReturnType<ChatService['handle']> {
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      recordEarly('invalid_request', 400, startedAt, telemetry.analyticsExcluded === true);
      return { status: 400, body: { error: 'invalid_request' } };
    }
    const active = await dependencies.readActivePublication();
    if (active === null) {
      recordEarly(
        'publication_unavailable',
        503,
        startedAt,
        telemetry.analyticsExcluded === true,
        parsed.data
      );
      return { status: 503, body: { error: 'unavailable' } };
    }
    const request = parsed.data;
    const last = request.messages.at(-1);
    if (last === undefined) return { status: 400, body: { error: 'invalid_request' } };
    const locale = replyLanguageForRequest(request);
    const priorVisitorTexts = request.messages
      .slice(0, -1)
      .filter((message) => message.role === 'visitor')
      .map((message) => message.text);
    const exchange: ExchangeContext = {
      id: randomUUID(),
      analyticsExcluded: telemetry.analyticsExcluded === true,
      visitorHash: visitorKey,
      deviceClass: telemetry.deviceClass ?? null,
      active,
      request,
      question: last.text,
      priorVisitorTexts,
      startedAt,
      locale,
    };
    if (checkVisitorChatLimits(dependencies.rateLimiter, visitorKey, startedAt).visitorExceeded)
      return scripted(exchange, unavailableReply(active.content, locale), 'rate_limited');
    const scriptedResult = dependencies.matcherCache
      .matcherFor(active.publicationId, active.content)
      .reply(last.text, locale, { priorVisitorTexts });
    const scriptedReply = scriptedResult.reply;
    const degraded = degradedReply(scriptedResult, active.content, locale);
    if (scriptedReply.outcome === 'sensitive') return scripted(exchange, scriptedReply, null);
    const utility = requestedUtility(request);
    if (utility !== null)
      return scripted(
        exchange,
        {
          outcome: 'answered',
          text: utility === 'cv' ? cvReplyText(locale) : contactReplyText(locale),
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
    const reply = isRejectedModelOutput(coordinated.decision.reason)
      ? rejectedOutputReply(scriptedResult, active.content, locale)
      : degraded;
    return deliver(exchange, reply, 'scripted', coordinated, settings.modelName, key);
  }
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
