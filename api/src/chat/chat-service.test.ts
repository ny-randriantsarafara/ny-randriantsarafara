import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createWithinBudgetGate } from '../budget/monthly-budget.ts';
import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import type { ChatModel } from './chat-model.ts';
import { createChatService } from './chat-service.ts';
import type { ExchangeRecorder } from './exchange-recorder.ts';
import { createScriptedMatcherCache } from './scripted-matcher-cache.ts';

const conversationId = '00000000-0000-4000-8000-000000000010';

function createRecorder(): ExchangeRecorder {
  return { record: vi.fn(async () => undefined) };
}

describe('createChatService', () => {
  it('returns scripted mode when model mode is disabled', async () => {
    const service = createChatService({
      readActivePublication: async () => activePublicationFixture,
      matcherCache: createScriptedMatcherCache(),
      model: null,
      modelConfiguration: null,
      budgetGate: createWithinBudgetGate(),
      rateLimiter: createMemoryRateLimiter(),
      exchangeRecorder: createRecorder(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });

    const result = await service.handle(
      {
        locale: 'en',
        conversationId,
        messages: [{ role: 'visitor', text: 'Tell me about your backend work.' }],
      },
      'visitor-key'
    );

    expect(result.status).toBe(200);
    if ('mode' in result.body) {
      expect(result.body.mode).toBe('scripted');
      expect(result.body.publicationId).toBe(activePublicationFixture.publicationId);
    }
  });

  it('returns 400 for an invalid request body', async () => {
    const service = createChatService({
      readActivePublication: async () => activePublicationFixture,
      matcherCache: createScriptedMatcherCache(),
      model: null,
      modelConfiguration: null,
      budgetGate: createWithinBudgetGate(),
      rateLimiter: createMemoryRateLimiter(),
      exchangeRecorder: createRecorder(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });

    const result = await service.handle({ locale: 'en' }, 'visitor-key');

    expect(result.status).toBe(400);
  });

  it('uses model mode when the provider returns a valid answer', async () => {
    const model: ChatModel = {
      complete: async () => ({
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
      }),
    };
    const service = createChatService({
      readActivePublication: async () => activePublicationFixture,
      matcherCache: createScriptedMatcherCache(),
      model,
      modelConfiguration: {
        baseUrl: 'https://api.example/v1',
        apiKey: 'key',
        modelName: 'test-model',
        inputPriceEurPerMillion: 1,
        outputPriceEurPerMillion: 2,
        monthlyBudgetEur: 5,
        dailyCallLimit: 2000,
      },
      budgetGate: createWithinBudgetGate(),
      rateLimiter: createMemoryRateLimiter(),
      exchangeRecorder: createRecorder(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });

    const result = await service.handle(
      {
        locale: 'en',
        conversationId,
        messages: [{ role: 'visitor', text: 'Tell me about your backend work.' }],
      },
      'visitor-key'
    );

    expect(result.status).toBe(200);
    if ('mode' in result.body) {
      expect(result.body.mode).toBe('model');
    }
  });
});
