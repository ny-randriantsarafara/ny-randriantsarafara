import type { ModelProviderConfiguration } from '../environment.ts';
import type { ModelProviderId } from '../model-settings/model-settings.ts';
import type { ChatModel, ChatModelRequest, ChatModelResult } from './chat-model.ts';
import { createProviderParameters } from './provider-parameters.ts';

export type OpenAiCompatibleModelDependencies = {
  provider: Pick<ModelProviderConfiguration, 'baseUrl' | 'apiKey'>;
  providerId?: ModelProviderId;
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
  let serializedBody: string;
  try {
    serializedBody = JSON.stringify(
      createProviderParameters(dependencies.providerId ?? 'openrouter', request)
    );
  } catch {
    return { status: 'invalid_output', usage: null };
  }
  try {
    const response = await dependencies.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dependencies.provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: serializedBody,
      signal: dependencies.createAbortSignal(request.timeoutMilliseconds),
    });
    if (!response.ok) {
      return { status: 'http', statusCode: response.status };
    }
    const payload: unknown = await response.json().catch(() => null);
    const parsed = parseCompletionPayload(payload);
    if (parsed === null) {
      return { status: 'invalid_output', usage: null };
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
  const usageRecord = isRecord(payload.usage) ? payload.usage : null;
  const promptDetails = readRecord(usageRecord, 'prompt_tokens_details');
  const outputDetails = readRecord(usageRecord, 'completion_tokens_details');
  const reasoning = outputDetails?.reasoning_tokens;
  const usage =
    usageRecord === null ||
    !validTokenCount(usageRecord.prompt_tokens) ||
    !validTokenCount(usageRecord.completion_tokens)
      ? null
      : {
          inputTokens: readTokenCount(usageRecord, 'prompt_tokens'),
          cacheReadTokens: readTokenCount(promptDetails, 'cached_tokens'),
          cacheWriteTokens: readTokenCount(promptDetails, 'cache_write_tokens'),
          outputTokens: readTokenCount(usageRecord, 'completion_tokens'),
          reasoningTokens:
            typeof reasoning === 'number' && Number.isFinite(reasoning) && reasoning >= 0
              ? reasoning
              : null,
        };
  const choices = payload.choices;
  const first = Array.isArray(choices) ? choices[0] : null;
  const message = isRecord(first) && isRecord(first.message) ? first.message : null;
  const metadata = {
    providerModel: typeof payload.model === 'string' ? payload.model : null,
    finishReason:
      isRecord(first) && typeof first.finish_reason === 'string' ? first.finish_reason : null,
    providerCost:
      usageRecord !== null &&
      typeof usageRecord.cost === 'number' &&
      Number.isFinite(usageRecord.cost) &&
      usageRecord.cost >= 0
        ? usageRecord.cost
        : null,
  };
  const output =
    message !== null && typeof message.content === 'string'
      ? parseJsonContent(message.content)
      : null;
  if (
    output === null ||
    message?.refusal ||
    (metadata.finishReason !== null && metadata.finishReason !== 'stop')
  ) {
    return {
      status: 'invalid_output',
      usage,
      generationId: typeof payload.id === 'string' ? payload.id : undefined,
      servedModel: metadata.providerModel ?? undefined,
      providerCostUsd: metadata.providerCost,
    };
  }
  return {
    status: 'ok',
    output,
    usage,
    generationId: typeof payload.id === 'string' ? payload.id : undefined,
    servedModel: metadata.providerModel ?? undefined,
    providerCostUsd: metadata.providerCost,
  };
}

function readRecord(
  record: Record<string, unknown> | null,
  field: string
): Record<string, unknown> | null {
  if (record === null) {
    return null;
  }
  const value = record[field];
  if (!isRecord(value)) {
    return null;
  }
  return value;
}

function readTokenCount(usage: Record<string, unknown> | null, field: string): number {
  if (usage === null) {
    return 0;
  }
  const value = usage[field];
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
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

function validTokenCount(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isInteger(value)
  );
}
