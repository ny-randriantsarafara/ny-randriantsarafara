import type { Locale, PublicationContent } from '@portfolio/content';

import type { ChatReply } from './contract.ts';
import { scriptedSuggestionsForOutcome, type MatcherResult } from './matcher.ts';
import { rephraseText, unavailableText } from './operational-copy.ts';

// Without a model reply, a published answer the question itself points to still helps. A local
// reply resting only on shared words may answer another question, and a local "unknown" says
// nothing about what the model would have known: the visitor is told the conversation is
// unavailable, not given a guess or told the information is missing.
export function degradedReply(
  scripted: MatcherResult,
  content: PublicationContent,
  locale: Locale
): ChatReply {
  if (scripted.basis === 'shared_words' || scripted.reply.outcome === 'unknown') {
    return unavailableReply(content, locale);
  }
  return scripted.reply;
}

// The model answered but the evidence checks refused its reply. A local reply resting only on
// shared words may answer another question, and its "unknown" may deny a published detail: the
// visitor is asked to rephrase instead.
export function rejectedOutputReply(
  scripted: MatcherResult,
  content: PublicationContent,
  locale: Locale
): ChatReply {
  if (scripted.basis === 'question') {
    return scripted.reply;
  }
  return {
    outcome: 'clarification_required',
    text: rephraseText(locale),
    answerSlugs: [],
    blocks: [],
    suggestions: scriptedSuggestionsForOutcome(content, locale, 'clarification_required'),
  };
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
