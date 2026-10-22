import type { ChatMode } from '@portfolio/chat';

export type PendingChatRender = {
  assistantId: string;
  requestId: string;
  startMark: number;
  apiMode: ChatMode | null;
  usedFallback: boolean;
};
