import { describe, expect, it, vi } from 'vitest';
import type { ChatReply } from '@portfolio/chat';
import {
  createResponseCoordinator,
  createResponseKey,
  type GenerationDecision,
} from './response-coordinator.ts';

const reply: ChatReply = {
  outcome: 'answered',
  text: 'Published fact.',
  answerSlugs: [],
  blocks: [],
  suggestions: [],
};
const completed: GenerationDecision = {
  status: 'completed',
  reply,
  usage: null,
  generationId: 'generation-1',
  costEur: null,
};

function deferred() {
  let finish: (value: GenerationDecision) => void = () => {
    throw new Error('Not initialized');
  };
  const promise = new Promise<GenerationDecision>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
}

describe('response coordination', () => {
  it('joins a pending exact request and computes a generation once', async () => {
    const coordinator = createResponseCoordinator(() => new Date(0));
    const pending = deferred();
    const compute = vi.fn(() => pending.promise);
    const owner = coordinator.resolve('same', compute);
    const joiner = coordinator.resolve('same', compute);
    pending.finish(completed);
    expect((await owner).source).toBe('provider');
    expect((await joiner).source).toBe('shared');
    expect(compute).toHaveBeenCalledTimes(1);
    expect((await coordinator.resolve('same', compute)).source).toBe('cache');
  });

  it('expires responses and never caches unknown or failed outputs', async () => {
    let now = 0;
    const coordinator = createResponseCoordinator(() => new Date(now));
    const compute = vi.fn(async () => completed);
    await coordinator.resolve('answer', compute);
    now = 300_000;
    expect((await coordinator.resolve('answer', compute)).source).toBe('provider');
    const unknown = vi.fn(
      async (): Promise<GenerationDecision> => ({
        ...completed,
        reply: { ...reply, outcome: 'unknown' },
      })
    );
    await coordinator.resolve('unknown', unknown);
    await coordinator.resolve('unknown', unknown);
    expect(unknown).toHaveBeenCalledTimes(2);
    const failure = vi.fn(
      async (): Promise<GenerationDecision> => ({
        status: 'fallback',
        reason: 'model_timeout',
        usage: null,
        generationId: null,
        costEur: null,
      })
    );
    await coordinator.resolve('failure', failure);
    await coordinator.resolve('failure', failure);
    expect(failure).toHaveBeenCalledTimes(2);
  });

  it('evicts least recently used responses and does not retain oversized answers', async () => {
    const coordinator = createResponseCoordinator(() => new Date(0));
    const compute = vi.fn(async () => completed);
    for (let i = 0; i < 64; i++) await coordinator.resolve(String(i), compute);
    await coordinator.resolve('0', compute);
    await coordinator.resolve('64', compute);
    expect((await coordinator.resolve('0', compute)).source).toBe('cache');
    expect((await coordinator.resolve('1', compute)).source).toBe('provider');
    const huge = async (): Promise<GenerationDecision> => ({
      ...completed,
      reply: { ...reply, text: 'x'.repeat(2_097_153) },
    });
    await coordinator.resolve('huge', huge);
    expect((await coordinator.resolve('huge', huge)).source).toBe('provider');
  });

  it('rejects a seventeenth distinct pending computation but still joins an existing one', async () => {
    const coordinator = createResponseCoordinator(() => new Date(0));
    const pending = deferred();
    const owners = Array.from({ length: 16 }, (_, i) =>
      coordinator.resolve(String(i), () => pending.promise)
    );
    const rejected = await coordinator.resolve('17', async () => completed);
    expect(rejected.source).toBe('rejected');
    expect(rejected.decision).toMatchObject({ status: 'fallback', reason: 'model_busy' });
    const joined = coordinator.resolve('0', async () => completed);
    pending.finish(completed);
    expect((await joined).source).toBe('shared');
    await Promise.all(owners);
  });

  it('clears pending work after a thrown computation', async () => {
    const coordinator = createResponseCoordinator(() => new Date(0));
    await expect(
      coordinator.resolve('retry', async () => {
        throw new Error('failed');
      })
    ).rejects.toThrow('failed');
    expect((await coordinator.resolve('retry', async () => completed)).source).toBe('provider');
  });
});

describe('response key', () => {
  const input = {
    publicationId: 'pub-1',
    locale: 'en',
    request: {
      locale: 'en',
      conversationId: '00000000-0000-4000-8000-000000000001',
      messages: [{ role: 'visitor', text: 'And there?' }],
    },
    providerIdentity: 'provider-profile',
    settings: { modelName: 'a', reasoningEffort: null },
    contractVersion: 'v3',
  } satisfies Parameters<typeof createResponseKey>[0];
  it('isolates publication, history, locale, provider and generation settings', () => {
    const key = createResponseKey(input);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    for (const changed of [
      { ...input, publicationId: 'pub-2' },
      { ...input, locale: 'fr' },
      { ...input, providerIdentity: 'other' },
      { ...input, settings: { ...input.settings, modelName: 'b' } },
      { ...input, contractVersion: 'v4' },
      {
        ...input,
        request: {
          ...input.request,
          messages: [
            { role: 'assistant', text: 'Old topic' },
            { role: 'visitor', text: 'And there?' },
          ],
        },
      },
    ] satisfies Parameters<typeof createResponseKey>[0][])
      expect(createResponseKey(changed)).not.toBe(key);
    expect(
      createResponseKey({ ...input, settings: { reasoningEffort: null, modelName: 'a' } })
    ).toBe(key);
  });
});
