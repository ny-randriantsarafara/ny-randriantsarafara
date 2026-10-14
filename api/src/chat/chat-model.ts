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

export type ChatModel = {
  complete(prompt: string): Promise<ChatModelResult>;
};
