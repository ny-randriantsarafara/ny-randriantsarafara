export type ChatModelUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ChatModelSuccess = {
  status: 'ok';
  output: unknown;
  usage: ChatModelUsage;
};

export type ChatModelFailure = {
  status: 'timeout' | 'http' | 'network';
  statusCode?: number;
};

export type ChatModelResult = ChatModelSuccess | ChatModelFailure;

export type ChatModelRequest = {
  prompt: string;
  outputSchema?: Record<string, unknown>;
  modelName: string;
  timeoutMilliseconds: number;
};

export type ChatModel = {
  complete(request: ChatModelRequest): Promise<ChatModelResult>;
};
