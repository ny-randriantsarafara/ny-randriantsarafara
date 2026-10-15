import { createHash } from 'node:crypto';
import type { ChatReply, ChatRequest } from '@portfolio/chat';
import type { Locale } from '@portfolio/content';
import type { ChatModelUsage } from './chat-model.ts';

export type GenerationMetadata = { servedModel?: string; providerCostUsd?: number | null };
export type GenerationDecision = GenerationMetadata &
  (
    | {
        status: 'completed';
        reply: ChatReply;
        usage: ChatModelUsage | null;
        generationId: string;
        costEur: number | null;
      }
    | {
        status: 'fallback';
        reason: string | null;
        usage: ChatModelUsage | null;
        generationId: string | null;
        costEur: number | null;
      }
  );
export type CoordinatedDecision = {
  source: 'provider' | 'cache' | 'shared' | 'rejected';
  decision: GenerationDecision;
};
export type ResponseCoordinator = {
  discard(key: string): void;
  resolve(
    key: string,
    compute: () => Promise<GenerationDecision>,
    retainCompleted?: boolean
  ): Promise<CoordinatedDecision>;
};

type Entry = { decision: GenerationDecision; expiresAt: number; bytes: number };
const MAX_BYTES = 2 * 1024 * 1024;

export function createResponseCoordinator(clock: () => Date): ResponseCoordinator {
  const pending = new Map<string, Promise<GenerationDecision>>();
  const entries = new Map<string, Entry>();
  let bytes = 0;
  function remove(key: string): void {
    const entry = entries.get(key);
    if (entry !== undefined) {
      bytes -= entry.bytes;
      entries.delete(key);
    }
  }
  function retain(key: string, decision: GenerationDecision): void {
    if (decision.status !== 'completed' || decision.reply.outcome !== 'answered') return;
    const size = Buffer.byteLength(JSON.stringify(decision));
    if (size > MAX_BYTES) return;
    remove(key);
    while (entries.size >= 64 || bytes + size > MAX_BYTES) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      remove(oldest.value);
    }
    entries.set(key, { decision, expiresAt: clock().getTime() + 300_000, bytes: size });
    bytes += size;
  }
  return {
    discard: remove,
    async resolve(key, compute, retainCompleted = true) {
      const cached = entries.get(key);
      if (cached !== undefined) {
        if (cached.expiresAt > clock().getTime()) {
          entries.delete(key);
          entries.set(key, cached);
          return { source: 'cache', decision: structuredClone(cached.decision) };
        }
        remove(key);
      }
      const running = pending.get(key);
      if (running !== undefined)
        return { source: 'shared', decision: structuredClone(await running) };
      if (pending.size >= 16)
        return {
          source: 'rejected',
          decision: {
            status: 'fallback',
            reason: 'model_busy',
            usage: null,
            generationId: null,
            costEur: null,
          },
        };
      // Insert the promise before compute starts, including its synchronous prefix.
      const generation = Promise.resolve().then(compute);
      pending.set(key, generation);
      try {
        const decision = await generation;
        if (retainCompleted) retain(key, structuredClone(decision));
        return { source: 'provider', decision };
      } finally {
        pending.delete(key);
      }
    },
  };
}

export function createResponseKey(input: {
  publicationId: string;
  locale: Locale;
  request: ChatRequest;
  providerIdentity: string;
  settings: object;
  contractVersion: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        stableValue({
          publicationId: input.publicationId,
          locale: input.locale,
          messages: input.request.messages,
          providerIdentity: input.providerIdentity,
          settings: input.settings,
          contractVersion: input.contractVersion,
        })
      )
    )
    .digest('hex');
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    );
  return value;
}
