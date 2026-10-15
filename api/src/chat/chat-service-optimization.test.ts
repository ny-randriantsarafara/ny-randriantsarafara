import type { ChatRequest, ChatResponse } from '@portfolio/chat';
import type { ActivePublication } from '@portfolio/content';
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';
import { type MonthlyBudgetStatus } from '../budget/monthly-budget.ts';
import { resolveModelSettings } from '../model-settings/model-settings.ts';
import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import type { ModelProviderRegistry } from './model-provider.ts';
import type { ChatModel, ChatModelResult } from './chat-model.ts';
import { createChatService } from './chat-service.ts';
import type { ExchangeRecorder } from './exchange-recorder.ts';
import { createScriptedMatcherCache } from './scripted-matcher-cache.ts';

const request: ChatRequest = {
  locale: 'en',
  conversationId: '00000000-0000-4000-8000-000000000010',
  messages: [{ role: 'visitor', text: 'Tell me about your backend work.' }],
};
const answer = activePublicationFixture.content.answers.find((answer) => answer.slug === 'why-me');
if (answer === undefined) throw new Error('Missing test source');
const success: ChatModelResult = {
  status: 'ok',
  output: {
    outcome: 'answered',
    text: 'Published backend experience.',
    evidence: [{ sourceId: 'answers/why-me/text/en', quote: answer.text.en }],
    suggestions: [],
    sensitiveTopicSlug: null,
  },
  usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 50 },
};
function setup(
  result: ChatModelResult | (() => Promise<ChatModelResult>) = success,
  dailyCallLimit = 2000
) {
  let active: ActivePublication | null = activePublicationFixture;
  let configuration = resolveModelSettings({
    model: 'test-model',
    input_price_eur_per_million: 1,
    output_price_eur_per_million: 2,
    cache_read_price_eur_per_million: null,
    cache_write_price_eur_per_million: null,
    reasoning_effort: null,
    timeout_ms: 10000,
    response_cache_enabled: true,
  });
  const complete = vi.fn<ChatModel['complete']>(
    typeof result === 'function' ? result : async () => result
  );
  const forProfile = vi.fn<ModelProviderRegistry['forProfile']>(() => ({ complete }));
  const record = vi.fn<ExchangeRecorder['record']>(async () => undefined);
  const budget = vi.fn(async (): Promise<MonthlyBudgetStatus> => 'within_budget');
  const readActivePublication = vi.fn(async () => active);
  const service = createChatService({
    readActivePublication,
    matcherCache: createScriptedMatcherCache(),
    modelMode: {
      model: { complete },
      registry: { forProfile },
      readSettings: async () => configuration,
      dailyCallLimit,
    },
    budgetGate: { readStatus: budget },
    rateLimiter: createMemoryRateLimiter(),
    exchangeRecorder: { record },
    clock: () => new Date('2026-10-15T12:00:00Z'),
  });
  return {
    service,
    readActivePublication,
    forProfile,
    complete,
    record,
    budget,
    setActive: (next: ActivePublication | null) => {
      active = next;
    },
    disable: () => {
      configuration = { status: 'disabled' };
    },
    setSettings: (settings: Parameters<typeof resolveModelSettings>[0]) => {
      configuration = resolveModelSettings(settings);
    },
  };
}
function chat(body: ChatResponse | { error: string }) {
  if (!('reply' in body)) throw new Error('Expected chat');
  return body;
}

describe('CMS model orchestration', () => {
  it('uses prudent unknown fallback after timeout instead of a factually adjacent FAQ', async () => {
    const { service, record } = setup({ status: 'timeout' });
    const result = await service.handle(request, 'visitor');
    expect(chat(result.body).reply).toMatchObject({
      outcome: 'unknown',
      text: activePublicationFixture.content.chatSettings.unknownReply.en,
      answerSlugs: [],
      blocks: [],
    });
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      failureReason: 'model_timeout',
      costEur: null,
    });
  });
  it('retains consumption when the transport rejects a completion', async () => {
    const { service, record } = setup({
      status: 'invalid_output',
      usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 50 },
    });
    await service.handle(request, 'visitor');
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      failureReason: 'model_invalid_output',
      inputTokens: 100,
      outputTokens: 50,
      costEur: 0.0002,
    });
  });
  it('delivers exact cached answers without rereading budget or duplicating spend', async () => {
    const { service, complete, record, budget } = setup();
    expect(chat((await service.handle(request, 'a')).body).mode).toBe('model');
    expect(chat((await service.handle(request, 'b')).body).mode).toBe('model');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(budget).toHaveBeenCalledTimes(1);
    expect(record.mock.calls.map(([input]) => [input.deliverySource, input.costEur])).toEqual([
      ['provider', 0.0002],
      ['cache', 0],
    ]);
    expect(record.mock.calls[0]?.[0].generationId).toBe(record.mock.calls[1]?.[0].generationId);
  });
  it('disables cache deliveries immediately when model is disabled', async () => {
    const { service, complete, disable } = setup();
    await service.handle(request, 'a');
    disable();
    expect(chat((await service.handle(request, 'b')).body).mode).toBe('scripted');
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('does not reuse a response across updated publications or changed histories', async () => {
    const { service, complete, setActive } = setup();
    await service.handle(request, 'a');
    await service.handle(
      {
        ...request,
        messages: [
          { role: 'assistant', text: 'Earlier topic' },
          { role: 'visitor', text: 'Tell me about your backend work.' },
        ],
      },
      'b'
    );
    setActive({
      ...activePublicationFixture,
      publicationId: '00000000-0000-4000-8000-000000000099',
    });
    await service.handle(request, 'c');
    expect(complete).toHaveBeenCalledTimes(3);
  });
  it('rejects an old in-flight response and records spend under its source publication', async () => {
    let finish: (result: ChatModelResult) => void = () => {
      throw new Error('Not ready');
    };
    const pending = new Promise<ChatModelResult>((resolve) => {
      finish = resolve;
    });
    const { service, complete, record, setActive } = setup(() => pending);
    const response = service.handle(request, 'a');
    await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    setActive({
      ...activePublicationFixture,
      publicationId: '00000000-0000-4000-8000-000000000099',
    });
    finish(success);
    expect(await response).toEqual({ status: 503, body: { error: 'unavailable' } });
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      publicationId: activePublicationFixture.publicationId,
      failureReason: 'publication_changed',
      costEur: 0.0002,
    });
  });
  it('keeps CV delivery deterministic and avoids inferring a model answer', async () => {
    const { service, complete } = setup();
    const response = chat(
      (
        await service.handle(
          { ...request, messages: [{ role: 'visitor', text: 'Send me your CV' }] },
          'a'
        )
      ).body
    );
    expect(response.reply.blocks).toEqual([{ type: 'cv' }]);
    expect(complete).not.toHaveBeenCalled();
  });
  it('rejects overlarge UTF-8 context before the model and daily budget gate', async () => {
    const { service, complete, record, budget, setSettings } = setup();
    setSettings({
      model: 'test-model',
      input_price_eur_per_million: 0,
      output_price_eur_per_million: 0,
      cache_read_price_eur_per_million: null,
      cache_write_price_eur_per_million: null,
      reasoning_effort: null,
      timeout_ms: 10000,
      max_input_bytes: 1,
    });
    expect(chat((await service.handle(request, 'a')).body).reply.outcome).toBe('unknown');
    expect(complete).not.toHaveBeenCalled();
    expect(budget).not.toHaveBeenCalled();
    expect(record.mock.calls.at(-1)?.[0].failureReason).toBe('model_context_limit');
  });
  it('coalesces concurrent deliveries and charges exactly one generation', async () => {
    let finish: (value: ChatModelResult) => void = () => {
      throw new Error('Not ready');
    };
    const pending = new Promise<ChatModelResult>((resolve) => {
      finish = resolve;
    });
    const { service, complete, record, budget } = setup(() => pending);
    const owner = service.handle(request, 'a');
    const joined = service.handle(request, 'b');
    await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    finish(success);
    expect((await owner).status).toBe(200);
    expect((await joined).status).toBe(200);
    expect(record.mock.calls.map(([input]) => input.costEur).sort()).toEqual([0, 0.0002]);
    expect(new Set(record.mock.calls.map(([input]) => input.generationId)).size).toBe(1);
    expect(record.mock.calls.map(([input]) => input.deliverySource).sort()).toEqual([
      'provider',
      'shared',
    ]);
    expect(budget).toHaveBeenCalledTimes(1);
  });
  it('discards a response if activation occurs between validation and final delivery', async () => {
    const { service, complete, setActive, readActivePublication } = setup();
    readActivePublication
      .mockImplementationOnce(async () => activePublicationFixture)
      .mockImplementationOnce(async () => activePublicationFixture)
      .mockImplementationOnce(async () => {
        setActive({
          ...activePublicationFixture,
          publicationId: '00000000-0000-4000-8000-000000000099',
        });
        return activePublicationFixture;
      });
    expect(await service.handle(request, 'a')).toEqual({
      status: 503,
      body: { error: 'unavailable' },
    });
    setActive(activePublicationFixture);
    expect((await service.handle(request, 'b')).status).toBe(200);
    expect(complete).toHaveBeenCalledTimes(2);
  });
  it('checks visitor limits before delivering a cached model answer', async () => {
    const { service, complete, record } = setup();
    for (let i = 0; i < 16; i++) await service.handle(request, 'same-visitor');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      failureReason: 'rate_limited',
      deliverySource: 'scripted',
    });
  });
  it('does not turn missing usage into a zero provider cost', async () => {
    const { service, record } = setup({ ...success, usage: null });
    await service.handle(request, 'a');
    await service.handle(request, 'b');
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      inputTokens: null,
      outputTokens: null,
      costEur: null,
      providerCostUsd: null,
    });
    expect(record.mock.calls[1]?.[0]).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      costEur: 0,
    });
  });
  it('isolates cached answers after CMS provider selection and checks credentials before any hit', async () => {
    const { service, complete, forProfile, setSettings } = setup();
    await service.handle(request, 'legacy');
    const profile = {
      id: '00000000-0000-4000-8000-000000000030',
      name: 'Saved model',
      provider: 'openrouter',
      model: 'same-model',
      input_price_eur_per_million: 1,
      output_price_eur_per_million: 2,
      cache_read_price_eur_per_million: null,
      cache_write_price_eur_per_million: null,
      reasoning_effort: null,
      timeout_ms: 10000,
      response_cache_enabled: true,
    };
    for (const provider of ['openrouter', 'google-ai-studio', 'openai']) {
      setSettings({
        ...profile,
        configuration_source: 'profile',
        active_profile: { ...profile, provider },
      });
      expect(chat((await service.handle(request, provider)).body).mode).toBe('model');
    }
    expect(complete).toHaveBeenCalledTimes(4);
    expect(forProfile.mock.calls.map(([settings]) => settings.providerId)).toEqual([
      'openrouter',
      'google-ai-studio',
      'openai',
    ]);
    forProfile.mockReturnValueOnce(null);
    expect(chat((await service.handle(request, 'missing-key')).body).reply.outcome).toBe('unknown');
    expect(complete).toHaveBeenCalledTimes(4);
  });
  it('serves cache at exhausted budget while enforcing the global limit only on new calls', async () => {
    const { service, complete, record, budget } = setup(success, 1);
    await service.handle(request, 'a');
    expect(chat((await service.handle(request, 'b')).body).mode).toBe('model');
    await service.handle(
      { ...request, messages: [{ role: 'visitor', text: 'Another backend question' }] },
      'c'
    );
    expect(record.mock.calls.at(-1)?.[0].failureReason).toBe('model_daily_limit');
    budget.mockResolvedValue('exhausted');
    expect(chat((await service.handle(request, 'd')).body).mode).toBe('model');
    await service.handle(
      { ...request, messages: [{ role: 'visitor', text: 'A distinct question' }] },
      'e'
    );
    expect(record.mock.calls.at(-1)?.[0].failureReason).toBe('budget_exhausted');
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('includes schema and conversation bytes at the exact UTF-8 input boundary', async () => {
    const { service, complete, record, setSettings, setActive } = setup();
    const active = structuredClone(activePublicationFixture);
    active.content.profile.introduction.en += ' café 🚀';
    setActive(active);
    await service.handle(request, 'a');
    const sent = complete.mock.calls[0]?.[0];
    if (sent === undefined) throw new Error('Expected model request');
    const bytes =
      Buffer.byteLength(sent.instructions) +
      Buffer.byteLength(sent.prompt) +
      Buffer.byteLength(JSON.stringify(sent.outputSchema));
    const row = {
      model: 'test-model',
      input_price_eur_per_million: 1,
      output_price_eur_per_million: 2,
      cache_read_price_eur_per_million: null,
      cache_write_price_eur_per_million: null,
      reasoning_effort: null,
      timeout_ms: 10000,
    };
    setSettings({ ...row, max_input_bytes: bytes });
    expect(chat((await service.handle(request, 'b')).body).mode).toBe('model');
    setSettings({ ...row, max_input_bytes: bytes - 1 });
    expect(chat((await service.handle(request, 'c')).body).reply.outcome).toBe('unknown');
    expect(record.mock.calls.at(-1)?.[0].failureReason).toBe('model_context_limit');
    expect(complete).toHaveBeenCalledTimes(2);
  });
});
