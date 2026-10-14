import type { ChatRequest } from '@portfolio/chat';

export type HistoryMessage = ChatRequest['messages'][number];

function trimmedMessage(message: HistoryMessage): HistoryMessage | null {
  const text = message.text.trim().slice(0, 500);
  if (text.length === 0) {
    return null;
  }
  return { role: message.role, text };
}

export function trimChatHistory(messages: readonly HistoryMessage[]): HistoryMessage[] {
  const trimmed = messages.flatMap((message) => {
    const next = trimmedMessage(message);
    if (next === null) {
      return [];
    }
    return [next];
  });
  if (trimmed.length <= 8) {
    return trimmed;
  }
  return trimmed.slice(trimmed.length - 8);
}
