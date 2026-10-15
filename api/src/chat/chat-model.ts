import type { ReasoningEffort } from '../model-settings/model-settings.ts';

export type ChatModelUsage = {
  // Includes the input tokens read from and written to the prompt cache.
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens?: number | null;
};

export type ChatModelSuccess = {
  status: 'ok';
  output: unknown;
  usage: ChatModelUsage | null;
  generationId?: string;
  servedModel?: string;
  providerCostUsd?: number | null;
};

export type ChatModelFailure = {
  status: 'timeout' | 'http' | 'network';
  statusCode?: number;
};

export type ChatModelInvalidOutput = {
  status: 'invalid_output';
  usage: ChatModelUsage | null;
  generationId?: string;
  servedModel?: string;
  providerCostUsd?: number | null;
};
export type ChatModelResult = ChatModelSuccess | ChatModelFailure | ChatModelInvalidOutput;

export type ChatModelRequest = {
  // Identical for every conversation in one reply language, so the provider can cache it.
  instructions: string;
  prompt: string;
  sessionId: string;
  outputSchema?: Record<string, unknown>;
  modelName: string;
  reasoningEffort: ReasoningEffort | null;
  timeoutMilliseconds: number;
  maxOutputTokens?: number | null;
};

export type ChatModel = {
  complete(request: ChatModelRequest): Promise<ChatModelResult>;
};
