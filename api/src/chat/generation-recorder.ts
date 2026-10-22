import { createTelemetryWriter } from '../analytics/directus-writer.ts';
import type { TelemetryCollector } from '../analytics/collector.ts';
import { diagnosticFields, type GenerationDiagnostics } from './exchange-recorder.ts';

export type GenerationRecordInput = GenerationDiagnostics & {
  id: string;
  receivedAt: string;
  completedAt: string;
  exchangeId: string;
  requestId: string | null;
  journeyId: string | null;
  conversationId: string | null;
  analyticsExcluded: boolean;
  publicationId: string;
  model: string;
  servedModel: string | null;
  status: 'completed' | 'rejected' | 'error';
  failureReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  reasoningTokens: number | null;
  costEur: number | null;
  providerCostUsd: number | null;
};
export type GenerationRecorder = { record(input: GenerationRecordInput): Promise<void> };

export function createDirectusGenerationRecorder(
  directusUrl: string,
  apiToken: string,
  log: (message: string) => void,
  fetchImpl: typeof fetch = globalThis.fetch,
  collector?: TelemetryCollector,
  environment: 'local' | 'staging' | 'prod' = 'local'
): GenerationRecorder {
  const writer = createTelemetryWriter(directusUrl, apiToken, log, fetchImpl, collector);
  return {
    record(input) {
      return writer.write('model_generations', {
        id: input.id,
        received_at: input.receivedAt,
        completed_at: input.completedAt,
        exchange_id: input.exchangeId,
        analytics_version: 1,
        environment,
        request_id: input.analyticsExcluded ? null : input.requestId,
        journey_id: input.analyticsExcluded ? null : input.journeyId,
        conversation_id: input.analyticsExcluded ? null : input.conversationId,
        analytics_excluded: input.analyticsExcluded,
        publication_id: input.publicationId,
        model: input.model,
        served_model: input.servedModel,
        status: input.status,
        failure_reason: input.failureReason,
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        cache_read_tokens: input.cacheReadTokens,
        cache_write_tokens: input.cacheWriteTokens,
        reasoning_tokens: input.reasoningTokens,
        cost_eur: input.costEur,
        provider_cost_usd: input.providerCostUsd,
        ...diagnosticFields(input, input.analyticsExcluded),
      });
    },
  };
}
