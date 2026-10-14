import type { ModelConfiguration } from '../environment.ts';
import type { ChatModel, ChatModelResult } from './chat-model.ts';
import { modelJsonSchema } from './model-output-schema.ts';

const TIMEOUT_MILLISECONDS = 8_000;

export type OpenAiCompatibleModelDependencies = {
  configuration: ModelConfiguration;
  fetchImpl: typeof fetch;
  createAbortSignal: (timeoutMilliseconds: number) => AbortSignal;
};

export function createOpenAiCompatibleModel(
  dependencies: OpenAiCompatibleModelDependencies
): ChatModel {
  return {
    complete: (prompt: string) => completePrompt(prompt, dependencies),
  };
}

async function completePrompt(
  prompt: string,
  dependencies: OpenAiCompatibleModelDependencies
): Promise<ChatModelResult> {
  const url = `${dependencies.configuration.baseUrl}/chat/completions`;
  const body = {
    model: dependencies.configuration.modelName,
    messages: [{ role: 'user', content: prompt }],
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
        Authorization: `Bearer ${dependencies.configuration.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: dependencies.createAbortSignal(TIMEOUT_MILLISECONDS),
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
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'timeout' };
    }
    return { status: 'network' };
  }
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
  let output: unknown;
  try {
    output = JSON.parse(message.content);
  } catch {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
