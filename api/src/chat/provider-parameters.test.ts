import type { ModelProviderId } from '../model-settings/model-settings.ts';
import { describe, expect, it } from 'vitest';
import { createProviderParameters } from './provider-parameters.ts';
import type { ChatModelRequest } from './chat-model.ts';
const request: ChatModelRequest = {
  modelName: 'chosen-model',
  instructions: 'rules',
  prompt: 'question',
  sessionId: 'session',
  reasoningEffort: 'low',
  timeoutMilliseconds: 1000,
  maxOutputTokens: 123,
};
describe('provider parameters', () => {
  it('isolates OpenRouter extensions', () => {
    const router = createProviderParameters('openrouter', request);
    expect(router).toMatchObject({
      session_id: 'session',
      reasoning: { effort: 'low' },
      max_tokens: 123,
    });
    const directProviders: ModelProviderId[] = ['openai', 'google-ai-studio'];
    for (const id of directProviders) {
      const body = createProviderParameters(id, request);
      expect(body).not.toHaveProperty('session_id');
      expect(body).not.toHaveProperty('reasoning');
      expect(body).toMatchObject({
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: 'rules' },
          { role: 'user', content: 'question' },
        ],
      });
    }
    expect(createProviderParameters('openai', request)).toHaveProperty(
      'max_completion_tokens',
      123
    );
  });
});
