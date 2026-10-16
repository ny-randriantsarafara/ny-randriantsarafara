import { describe, expect, it, vi } from 'vitest';
import { createDirectusExchangeRecorder } from './exchange-recorder.ts';

describe('exchange recording', () => {
  it('writes nullable consumption and generation delivery metadata without inventing missing usage', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ data: { id: '1' } }));
    const recorder = createDirectusExchangeRecorder(
      'https://cms.example',
      'test-token',
      () => undefined,
      fetchImpl
    );
    await recorder.record({
      locale: 'fr',
      conversationId: 'conversation',
      question: 'Question',
      mode: 'scripted',
      outcome: 'unknown',
      answerSlugs: [],
      blocks: [],
      latencyMs: 123,
      model: 'model-a',
      inputTokens: 1200,
      outputTokens: 80,
      costEur: 0.01,
      failureReason: 'model_invalid_output',
      publicationId: 'publication',
      generationId: 'generation',
      servedModel: 'model-a-v1',
      cacheReadTokens: 1000,
      cacheWriteTokens: 0,
      reasoningTokens: null,
      providerCostUsd: 0,
      deliverySource: 'provider',
    });
    const request = fetchImpl.mock.calls.at(-1);
    expect(request?.[0]).toBe('https://cms.example/items/chat_exchanges');
    const payload: unknown = JSON.parse(String(request?.[1]?.body));
    expect(payload).toMatchObject({
      generation_id: 'generation',
      cache_read_tokens: 1000,
      cache_write_tokens: 0,
      reasoning_tokens: null,
      provider_cost_usd: 0,
      delivery_source: 'provider',
      failure_reason: 'model_invalid_output',
      cost_eur: 0.01,
    });
  });
  it('stores the question without the contact details a visitor pasted', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ data: { id: '1' } }));
    const recorder = createDirectusExchangeRecorder(
      'https://cms.example',
      'test-token',
      () => undefined,
      fetchImpl
    );
    await recorder.record({
      locale: 'en',
      conversationId: 'conversation',
      question: 'Are you available? Write to jane@example.com or call 06 12 34 56 78.',
      mode: 'scripted',
      outcome: 'temporarily_unavailable',
      answerSlugs: [],
      blocks: [],
      latencyMs: 1,
      model: null,
      inputTokens: null,
      outputTokens: null,
      costEur: null,
      failureReason: 'model_timeout',
      publicationId: 'publication',
    });
    const payload: unknown = JSON.parse(String(fetchImpl.mock.calls.at(-1)?.[1]?.body));
    expect(payload).toMatchObject({
      question: 'Are you available? Write to [email] or call [number].',
      outcome: 'temporarily_unavailable',
    });
  });

  it('does not fail the visitor request if recording is unavailable', async () => {
    const log = vi.fn();
    const recorder = createDirectusExchangeRecorder(
      'https://cms.example',
      'test-token',
      log,
      async () => {
        throw new Error('network unavailable');
      }
    );
    await recorder.record({
      locale: 'en',
      conversationId: 'conversation',
      question: 'Question',
      mode: 'scripted',
      outcome: 'unknown',
      answerSlugs: [],
      blocks: [],
      latencyMs: 1,
      model: null,
      inputTokens: null,
      outputTokens: null,
      costEur: null,
      failureReason: 'model_timeout',
      publicationId: 'publication',
    });
    expect(log).toHaveBeenCalledTimes(1);
  });
});
