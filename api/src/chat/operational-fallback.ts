import { scriptedSuggestionsForOutcome, type ChatReply } from '@portfolio/chat';
import type { Locale, PublicationContent } from '@portfolio/content';

export function createOperationalFallback(content: PublicationContent, locale: Locale): ChatReply {
  return {
    outcome: 'unknown',
    text: content.chatSettings.unknownReply[locale],
    answerSlugs: [],
    blocks: [],
    suggestions: scriptedSuggestionsForOutcome(content, locale, 'unknown'),
  };
}
