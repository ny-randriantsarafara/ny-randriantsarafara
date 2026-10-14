import type { ModelProviderConfiguration } from '../environment.ts';
import type { ChatModel, ChatModelRequest, ChatModelResult } from './chat-model.ts';
import { modelJsonSchema } from './model-output-schema.ts';

export type OpenAiCompatibleModelDependencies = {
  provider: Pick<ModelProviderConfiguration, 'baseUrl' | 'apiKey'>;
  fetchImpl: typeof fetch;
  createAbortSignal: (timeoutMilliseconds: number) => AbortSignal;
};

export function createOpenAiCompatibleModel(
  dependencies: OpenAiCompatibleModelDependencies
): ChatModel {
  return {
    complete: (request: ChatModelRequest) => completePrompt(request, dependencies),
  };
}

async function completePrompt(
  request: ChatModelRequest,
  dependencies: OpenAiCompatibleModelDependencies
): Promise<ChatModelResult> {
  const url = `${dependencies.provider.baseUrl}/chat/completions`;
  const body = {
    model: request.modelName,
    messages: [{ role: 'user', content: request.prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'chat_reply',
        strict: true,
        schema: modelJsonSchema,
      },
    },
  };
  try {
    const response = await dependencies.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dependencies.provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: dependencies.createAbortSignal(request.timeoutMilliseconds),
    });
    if (!response.ok) {
      return { status: 'http', statusCode: response.status };
    }
    const payload = await response.json();
    const parsed = parseCompletionPayload(payload);
    if (parsed === null) {
      return { status: 'http', statusCode: response.status };
    }
    return parsed;
  } catch (error) {
    if (isAbortError(error)) {
      return { status: 'timeout' };
    }
    return { status: 'network' };
  }
}

// AbortSignal.timeout rejects with a TimeoutError; a manually aborted signal rejects with an AbortError.
function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || error.name === 'TimeoutError';
}

function parseCompletionPayload(payload: unknown): ChatModelResult | null {
  if (!isRecord(payload)) {
    return null;
  }
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = choices[0];
  if (!isRecord(first)) {
    return null;
  }
  const message = first.message;
  if (!isRecord(message) || typeof message.content !== 'string') {
    return null;
  }
  const output = parseJsonContent(message.content);
  if (output === null) {
    return null;
  }
  const usageRecord = isRecord(payload.usage) ? payload.usage : null;
  const inputTokens = readTokenCount(usageRecord, 'prompt_tokens');
  const outputTokens = readTokenCount(usageRecord, 'completion_tokens');
  return {
    status: 'ok',
    output,
    usage: { inputTokens, outputTokens },
  };
}

function readTokenCount(usage: Record<string, unknown> | null, field: string): number {
  if (usage === null) {
    return 0;
  }
  const value = usage[field];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function parseJsonContent(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
