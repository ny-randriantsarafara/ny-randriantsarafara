import { createScriptedMatcher } from '@portfolio/chat';

import { trimChatHistory, type HistoryMessage } from '@/lib/chat/chat-history.ts';

import type { ChatResponse } from '@portfolio/chat';
import type { ActivePublication, Locale } from '@portfolio/content';

function lastVisitorText(messages: readonly HistoryMessage[]): string | null {
  const reversed = [...messages].reverse();
  const found = reversed.find((message) => message.role === 'visitor');
  if (found === undefined) {
    return null;
  }
  return found.text;
}

function priorVisitorTexts(messages: readonly HistoryMessage[]): string[] {
  return messages
    .slice(0, -1)
    .filter((message) => message.role === 'visitor')
    .map((message) => message.text);
}

export function buildScriptedChatResponse(
  publication: ActivePublication,
  locale: Locale,
  messages: readonly HistoryMessage[]
): ChatResponse {
  const history = trimChatHistory(messages);
  const question = lastVisitorText(history);
  if (question === null) {
    throw new Error('Scripted fallback requires a visitor message');
  }
  const matcher = createScriptedMatcher(publication.content);
  const { reply } = matcher.reply(question, locale, {
    priorVisitorTexts: priorVisitorTexts(history),
  });
  return {
    mode: 'scripted',
    publicationId: publication.publicationId,
    reply,
  };
}
