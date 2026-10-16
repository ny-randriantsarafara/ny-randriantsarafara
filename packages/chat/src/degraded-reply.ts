import type { Locale, PublicationContent } from '@portfolio/content';

import type { ChatReply } from './contract.ts';
import { scriptedSuggestionsForOutcome } from './matcher.ts';
import { unavailableText } from './operational-copy.ts';

// Without a model reply, a published answer the local matcher is confident about still helps.
// A local "unknown" says nothing about what the model would have known: the visitor is told the
// conversation is unavailable, not that the information is missing.
export function degradedReply(
  scriptedReply: ChatReply,
  content: PublicationContent,
  locale: Locale
): ChatReply {
  if (scriptedReply.outcome !== 'unknown') {
    return scriptedReply;
  }
  return unavailableReply(content, locale);
}

export function unavailableReply(content: PublicationContent, locale: Locale): ChatReply {
  return {
    outcome: 'temporarily_unavailable',
    text: unavailableText(locale),
    answerSlugs: [],
    blocks: [],
    suggestions: scriptedSuggestionsForOutcome(content, locale, 'temporarily_unavailable'),
  };
}
