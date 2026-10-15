import { createItem, createDirectus, rest, staticToken } from '@directus/sdk';
import type { ChatMode, ChatOutcome } from '@portfolio/chat';
import type { Block, Locale } from '@portfolio/content';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type ExchangeRecordInput = {
  locale: Locale;
  conversationId: string;
  question: string;
  mode: ChatMode;
  outcome: ChatOutcome;
  answerSlugs: string[];
  blocks: Block[];
  latencyMs: number;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costEur: number | null;
  failureReason: string | null;
  publicationId: string;
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
  fetchImpl: typeof fetch = globalThis.fetch
): ExchangeRecorder {
  const client = createDirectus<PortfolioSchema>(directusUrl, {
    globals: {
      fetch: fetchImpl,
      WebSocket: globalThis.WebSocket,
      URL: globalThis.URL,
      logger: globalThis.console,
    },
  })
    .with(staticToken(apiToken))
    .with(rest());

  return {
    async record(input: ExchangeRecordInput): Promise<void> {
      try {
        await client.request(
          createItem('chat_exchanges', {
            locale: input.locale,
            conversation_id: input.conversationId,
            question: input.question,
            mode: input.mode,
            outcome: input.outcome,
            answer_slugs: input.answerSlugs,
            blocks: input.blocks,
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
          })
        );
      } catch (error) {
        log(`Chat exchange recording failed: ${describeError(error)}`);
      }
    },
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
