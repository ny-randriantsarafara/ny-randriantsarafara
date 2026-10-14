import { describe, expect, it } from 'vitest';

import { trimChatHistory, type HistoryMessage } from '@/lib/chat/chat-history.ts';

describe('trimChatHistory', () => {
  it('trims whitespace and enforces the 500 character limit', () => {
    const longText = 'a'.repeat(600);
    const result = trimChatHistory([{ role: 'visitor', text: `  ${longText}  ` }]);
    expect(result[0]?.text.length).toBe(500);
  });

  it('keeps only the last eight turns', () => {
    const messages: HistoryMessage[] = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'visitor' : 'assistant',
      text: `message-${index}`,
    }));
    const result = trimChatHistory(messages);
    expect(result).toHaveLength(8);
    expect(result[0]?.text).toBe('message-2');
  });

  it('drops empty messages after trimming', () => {
    const result = trimChatHistory([{ role: 'visitor', text: '   ' }]);
    expect(result).toHaveLength(0);
  });
});
