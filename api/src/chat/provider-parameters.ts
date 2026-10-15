import type { ModelProviderId } from '../model-settings/model-settings.ts';
import type { ChatModelRequest } from './chat-model.ts';
import { modelJsonSchema } from './model-output-schema.ts';

export function createProviderParameters(
  providerId: ModelProviderId,
  request: ChatModelRequest
): Record<string, unknown> {
  const openRouter = providerId === 'openrouter';
  return {
    model: request.modelName,
    ...(openRouter ? { session_id: request.sessionId } : {}),
    ...(request.reasoningEffort === null
      ? {}
      : openRouter
        ? { reasoning: { effort: request.reasoningEffort } }
        : { reasoning_effort: request.reasoningEffort }),
    ...(request.maxOutputTokens == null
      ? {}
      : providerId === 'openai'
        ? { max_completion_tokens: request.maxOutputTokens }
        : { max_tokens: request.maxOutputTokens }),
    messages: [
      {
        role: 'system',
        content: openRouter
          ? [{ type: 'text', text: request.instructions, cache_control: { type: 'ephemeral' } }]
          : request.instructions,
      },
      { role: 'user', content: request.prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'chat_reply',
        strict: true,
        schema: request.outputSchema ?? modelJsonSchema,
      },
    },
  };
}
