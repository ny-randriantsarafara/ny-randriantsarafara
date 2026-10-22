import { randomUUID } from 'node:crypto';
import type { ChatMode, ChatOutcome } from '@portfolio/chat';
import type { Block, Locale } from '@portfolio/content';
import { createTelemetryWriter } from '../analytics/directus-writer.ts';
import type { TelemetryCollector } from '../analytics/collector.ts';
import { redactQuestion } from './redact-question.ts';

export type GenerationDiagnostics = {
  providerId?: string | null;
  profileId?: string | null;
  configurationFingerprint?: string | null;
  promptVersion?: string | null;
  inputBytes?: number | null;
  contextBytes?: number | null;
  providerDurationMs?: number | null;
  validationDurationMs?: number | null;
  validationStatus?: string | null;
  evidenceReferences?: { sourceId: string; quote: string }[];
};

export function diagnosticFields(input: GenerationDiagnostics, excluded = false) {
  return {
    provider_id: input.providerId ?? null,
    profile_id: input.profileId ?? null,
    configuration_fingerprint: input.configurationFingerprint ?? null,
    prompt_version: input.promptVersion ?? null,
    input_bytes: input.inputBytes ?? null,
    context_bytes: input.contextBytes ?? null,
    provider_duration_ms: input.providerDurationMs ?? null,
    validation_duration_ms: input.validationDurationMs ?? null,
    validation_status: input.validationStatus ?? null,
    evidence_references: excluded
      ? []
      : (input.evidenceReferences ?? []).slice(0, 32).map(({ sourceId, quote }) => ({
          sourceId: sourceId.slice(0, 500),
          quote: redactQuestion(quote).slice(0, 2000),
        })),
  };
}

export type ExchangeRecordInput = GenerationDiagnostics & {
  id?: string;
  requestId?: string | null;
  journeyId?: string | null;
  receivedAt?: string;
  responseText?: string | null;
  analyticsExcluded?: boolean;
  httpStatus?: number;
  visitorHash?: string | null;
  deviceClass?: 'mobile' | 'tablet' | 'desktop' | null;
  locale: Locale | null;
  conversationId: string | null;
  question: string | null;
  mode: ChatMode | null;
  outcome: ChatOutcome | null;
  answerSlugs: string[];
  blocks: Block[];
  latencyMs: number;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costEur: number | null;
  failureReason: string | null;
  publicationId: string | null;
  generationId?: string | null;
  servedModel?: string | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
  reasoningTokens?: number | null;
  providerCostUsd?: number | null;
  deliverySource?: 'provider' | 'cache' | 'shared' | 'scripted';
};

export type ExchangeRecorder = {
  record(input: ExchangeRecordInput): Promise<void>;
};

export function createDirectusExchangeRecorder(
  directusUrl: string,
  apiToken: string,
  log: (message: string) => void,
  fetchImpl: typeof fetch = globalThis.fetch,
  collector?: TelemetryCollector,
  environment: 'local' | 'staging' | 'prod' = 'local'
): ExchangeRecorder {
  const writer = createTelemetryWriter(directusUrl, apiToken, log, fetchImpl, collector);
  return {
    record(input) {
      const excluded = input.analyticsExcluded === true;
      return writer.write('chat_exchanges', {
        id: input.id ?? randomUUID(),
        received_at: input.receivedAt ?? new Date().toISOString(),
        analytics_version: 1,
        environment,
        analytics_excluded: excluded,
        http_status: input.httpStatus ?? 200,
        locale: excluded ? null : input.locale,
        conversation_id: excluded ? null : input.conversationId,
        request_id: excluded ? null : (input.requestId ?? null),
        journey_id: excluded ? null : (input.journeyId ?? null),
        visitor_hash: excluded ? null : (input.visitorHash ?? null),
        device_class: excluded ? null : (input.deviceClass ?? null),
        question:
          excluded || input.question === null
            ? null
            : redactQuestion(input.question).slice(0, 2000),
        response_text:
          excluded || input.responseText == null
            ? null
            : redactQuestion(input.responseText).slice(0, 8000),
        mode: input.mode,
        outcome: input.outcome,
        answer_slugs: excluded ? [] : input.answerSlugs,
        blocks: excluded ? [] : input.blocks,
        latency_ms: input.latencyMs,
        model: input.model,
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        cost_eur: input.costEur,
        failure_reason: input.failureReason,
        publication_id: input.publicationId,
        generation_id: input.generationId ?? null,
        served_model: input.servedModel ?? null,
        cache_read_tokens: input.cacheReadTokens ?? null,
        cache_write_tokens: input.cacheWriteTokens ?? null,
        reasoning_tokens: input.reasoningTokens ?? null,
        provider_cost_usd: input.providerCostUsd ?? null,
        delivery_source: input.deliverySource ?? 'scripted',
        coalesced_generation_id:
          input.deliverySource === 'shared' ? (input.generationId ?? null) : null,
        ...diagnosticFields(input, excluded),
      });
    },
  };
}
