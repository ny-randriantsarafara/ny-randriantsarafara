import type { ChatResponse } from '@portfolio/chat';
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createWithinBudgetGate } from '../budget/monthly-budget.ts';
import type { ModelSettings, ModelSettingsStatus } from '../model-settings/model-settings.ts';
import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import type { ChatModel, ChatModelResult } from './chat-model.ts';
import {
  createChatService,
  type ChatServiceDependencies,
  type ModelModeDependencies,
} from './chat-service.ts';
import type { ExchangeRecorder } from './exchange-recorder.ts';
import { createScriptedMatcherCache } from './scripted-matcher-cache.ts';

const conversationId = '00000000-0000-4000-8000-000000000010';

const modelSettings: ModelSettings = {
  modelName: 'test-model',
  inputPriceEurPerMillion: 1,
  outputPriceEurPerMillion: 2,
  timeoutMilliseconds: 10_000,
};

const validModelResult: ChatModelResult = {
  status: 'ok',
  output: {
    outcome: 'answered',
    text: 'I focus on reliable backend systems.',
    answerSlugs: ['why-me'],
    blocks: [{ type: 'strengths', answerSlug: 'why-me' }],
    suggestions: ['What stack do you use?', 'Tell me about Visa.'],
    sensitiveTopicSlug: null,
  },
  usage: { inputTokens: 100, outputTokens: 50 },
};

function createRecorder() {
  return vi.fn<ExchangeRecorder['record']>(async () => undefined);
}

function createModel(result: ChatModelResult) {
  return vi.fn<ChatModel['complete']>(async () => result);
}

function modelMode(
  complete: ChatModel['complete'],
  settingsStatus: ModelSettingsStatus = { status: 'configured', settings: modelSettings }
): ModelModeDependencies {
  return {
    model: { complete },
    readSettings: async () => settingsStatus,
    dailyCallLimit: 2000,
  };
}

function createService(overrides: Partial<ChatServiceDependencies>) {
  return createChatService({
    readActivePublication: async () => activePublicationFixture,
    matcherCache: createScriptedMatcherCache(),
    modelMode: null,
    budgetGate: createWithinBudgetGate(),
    rateLimiter: createMemoryRateLimiter(),
    exchangeRecorder: { record: createRecorder() },
    clock: () => new Date('2026-10-14T12:00:00.000Z'),
    ...overrides,
  });
}

function visitorRequest(text: string) {
  return { locale: 'en', conversationId, messages: [{ role: 'visitor', text }] };
}

function expectChatResponse(body: ChatResponse | { error: string }): ChatResponse {
  if (!('mode' in body)) {
    throw new Error(`Expected a chat response, received ${JSON.stringify(body)}`);
  }
  return body;
}

describe('createChatService', () => {
  it('answers in scripted mode and records why when model mode is disabled', async () => {
    const record = createRecorder();
    const service = createService({ exchangeRecorder: { record } });

    const result = await service.handle(
      visitorRequest('Tell me about your backend work.'),
      'visitor'
    );

    expect(result.status).toBe(200);
    const body = expectChatResponse(result.body);
    expect(body.mode).toBe('scripted');
    expect(body.publicationId).toBe(activePublicationFixture.publicationId);
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      mode: 'scripted',
      failureReason: 'model_disabled',
      costEur: null,
    });
  });

  it('rejects an invalid body before reading the publication', async () => {
    const readActivePublication = vi.fn(async () => activePublicationFixture);
    const service = createService({ readActivePublication });

    const result = await service.handle({ locale: 'en' }, 'visitor');

    expect(result).toEqual({ status: 400, body: { error: 'invalid_request' } });
    expect(readActivePublication).not.toHaveBeenCalled();
  });

  it('is unavailable without an active publication', async () => {
    const service = createService({ readActivePublication: async () => null });

    const result = await service.handle(visitorRequest('Hello'), 'visitor');

    expect(result).toEqual({ status: 503, body: { error: 'unavailable' } });
  });

  it('answers in model mode and records the spend', async () => {
    const record = createRecorder();
    const service = createService({
      modelMode: modelMode(createModel(validModelResult)),
      exchangeRecorder: { record },
    });

    const result = await service.handle(
      visitorRequest('Tell me about your backend work.'),
      'visitor'
    );

    expect(expectChatResponse(result.body).mode).toBe('model');
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      mode: 'model',
      model: 'test-model',
      inputTokens: 100,
      outputTokens: 50,
      costEur: 0.0002,
      failureReason: null,
    });
  });

  it('calls the model chosen in the CMS with its timeout', async () => {
    const complete = createModel(validModelResult);
    const service = createService({ modelMode: modelMode(complete) });

    await service.handle(visitorRequest('Tell me about your backend work.'), 'visitor');

    expect(complete).toHaveBeenCalledWith({
      prompt: expect.stringContaining('Tell me about your backend work.'),
      modelName: 'test-model',
      timeoutMilliseconds: 10_000,
      outputSchema: expect.any(Object),
    });
  });

  it('constrains model identifiers to the active publication', async () => {
    const complete = createModel(validModelResult);
    const service = createService({ modelMode: modelMode(complete) });
    await service.handle(visitorRequest('Tell me about your backend work.'), 'visitor');
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        outputSchema: expect.objectContaining({
          properties: expect.objectContaining({
            answerSlugs: { type: 'array', items: { type: 'string', enum: ['journey', 'why-me'] } },
          }),
        }),
      })
    );
  });

  it('records a zero cost for a free model', async () => {
    const record = createRecorder();
    const freeSettings: ModelSettings = {
      ...modelSettings,
      inputPriceEurPerMillion: 0,
      outputPriceEurPerMillion: 0,
    };
    const service = createService({
      modelMode: modelMode(createModel(validModelResult), {
        status: 'configured',
        settings: freeSettings,
      }),
      exchangeRecorder: { record },
    });

    await service.handle(visitorRequest('Tell me about your backend work.'), 'visitor');

    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({ mode: 'model', costEur: 0 });
  });

  it.each([
    { settingsStatus: { status: 'disabled' }, failureReason: 'model_disabled' },
    {
      settingsStatus: { status: 'invalid', fields: ['timeout_ms'] },
      failureReason: 'model_settings_invalid',
    },
    { settingsStatus: { status: 'unavailable' }, failureReason: 'model_settings_unavailable' },
  ] satisfies { settingsStatus: ModelSettingsStatus; failureReason: string }[])(
    'answers in scripted mode with $failureReason without calling the model',
    async ({ settingsStatus, failureReason }) => {
      const record = createRecorder();
      const complete = createModel(validModelResult);
      const service = createService({
        modelMode: modelMode(complete, settingsStatus),
        exchangeRecorder: { record },
      });

      const result = await service.handle(
        visitorRequest('Tell me about your backend work.'),
        'visitor'
      );

      expect(expectChatResponse(result.body).mode).toBe('scripted');
      expect(complete).not.toHaveBeenCalled();
      expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
        failureReason,
        model: null,
        costEur: null,
      });
    }
  );

  it('returns without waiting for exchange recording on model success', async () => {
    const service = createService({
      modelMode: modelMode(createModel(validModelResult)),
      exchangeRecorder: { record: () => new Promise(() => undefined) },
    });

    const result = await service.handle(
      visitorRequest('Tell me about your backend work.'),
      'visitor'
    );

    expect(result.status).toBe(200);
  });

  it('records the spend of a rejected model output and falls back to scripted', async () => {
    const record = createRecorder();
    const service = createService({
      modelMode: modelMode(
        createModel({
          status: 'ok',
          output: { outcome: 'answered', text: 'Unsupported shape' },
          usage: { inputTokens: 100, outputTokens: 50 },
        })
      ),
      exchangeRecorder: { record },
    });

    const result = await service.handle(
      visitorRequest('Tell me about your backend work.'),
      'visitor'
    );

    expect(expectChatResponse(result.body).mode).toBe('scripted');
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      mode: 'scripted',
      failureReason: 'model_invalid_output',
      model: 'test-model',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(record.mock.calls.at(-1)?.[0].costEur).toBeGreaterThan(0);
  });

  it('falls back to scripted without spend when the model times out', async () => {
    const record = createRecorder();
    const service = createService({
      modelMode: modelMode(createModel({ status: 'timeout' })),
      exchangeRecorder: { record },
    });

    const result = await service.handle(
      visitorRequest('Tell me about your backend work.'),
      'visitor'
    );

    expect(expectChatResponse(result.body).mode).toBe('scripted');
    expect(record.mock.calls.at(-1)?.[0]).toMatchObject({
      failureReason: 'model_timeout',
      model: null,
      costEur: null,
    });
  });

  it('answers sensitive topics without calling the model', async () => {
    const complete = createModel(validModelResult);
    const service = createService({ modelMode: modelMode(complete) });

    const result = await service.handle(visitorRequest('What is your salary?'), 'visitor');

    expect(expectChatResponse(result.body).reply.outcome).toBe('sensitive');
    expect(complete).not.toHaveBeenCalled();
  });

  it('counts sensitive messages toward the visitor limits', async () => {
    const record = createRecorder();
    const service = createService({
      modelMode: modelMode(createModel(validModelResult)),
      exchangeRecorder: { record },
    });

    await service.handle(visitorRequest('What is your salary?'), 'limited');
    for (const _message of Array.from({ length: 14 })) {
      await service.handle(visitorRequest('Tell me about your backend work.'), 'limited');
    }
    const limited = await service.handle(
      visitorRequest('Tell me about your backend work.'),
      'limited'
    );

    expect(expectChatResponse(limited.body).mode).toBe('scripted');
    expect(record.mock.calls.at(-1)?.[0].failureReason).toBe('rate_limited');
  });
});
