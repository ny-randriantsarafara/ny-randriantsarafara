import type { ModelProviderId } from '../model-settings/model-settings.ts';
import { expect, it, vi } from 'vitest';
import { createModelProviderRegistry } from './model-provider.ts';
import type { ModelSettings } from '../model-settings/model-settings.ts';
const settings: ModelSettings = {
  providerId: 'openai',
  modelName: 'chosen-model',
  reasoningEffort: null,
  inputPriceEurPerMillion: 0,
  outputPriceEurPerMillion: 0,
  cacheReadPriceEurPerMillion: 0,
  cacheWritePriceEurPerMillion: 0,
  timeoutMilliseconds: 1000,
};
it('never borrows another provider credential', () => {
  const fetchImpl = vi.fn();
  const registry = createModelProviderRegistry({ openrouter: { apiKey: 'router' } }, fetchImpl);
  expect(registry.forProfile(settings)).toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(registry.forProfile({ ...settings, providerId: 'openrouter' })).not.toBeNull();
});

it('routes each selected profile to its fixed endpoint with its own credential', async () => {
  const calls: { url: string; authorization: string | null }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get('Authorization'),
    });
    return Response.json({
      choices: [{ message: { content: '{}' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
  };
  const registry = createModelProviderRegistry(
    {
      openrouter: { apiKey: 'router' },
      'google-ai-studio': { apiKey: 'gemini' },
      openai: { apiKey: 'openai' },
    },
    fetchImpl
  );
  const providerIds: ModelProviderId[] = ['openrouter', 'google-ai-studio', 'openai'];
  for (const providerId of providerIds) {
    const model = registry.forProfile({ ...settings, providerId });
    if (model === null) throw new Error('Expected configured provider');
    await model.complete({
      instructions: 'rules',
      prompt: 'q',
      sessionId: 'session',
      modelName: 'model',
      reasoningEffort: null,
      timeoutMilliseconds: 1000,
    });
  }
  expect(calls).toEqual([
    { url: 'https://openrouter.ai/api/v1/chat/completions', authorization: 'Bearer router' },
    {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      authorization: 'Bearer gemini',
    },
    { url: 'https://api.openai.com/v1/chat/completions', authorization: 'Bearer openai' },
  ]);
});
it('rejects mandatory-thinking Gemini configurations before any request', () => {
  const fetchImpl = vi.fn();
  const registry = createModelProviderRegistry(
    { 'google-ai-studio': { apiKey: 'gemini' } },
    fetchImpl
  );
  expect(
    registry.forProfile({
      ...settings,
      providerId: 'google-ai-studio',
      modelName: 'gemini-2.5-pro',
      reasoningEffort: 'none',
    })
  ).toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
});
