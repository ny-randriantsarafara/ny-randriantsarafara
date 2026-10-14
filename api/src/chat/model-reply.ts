import { scriptedSuggestionsForOutcome } from '@portfolio/chat';
import type { ChatReply } from '@portfolio/chat';
import type { Locale, PublicationContent } from '@portfolio/content';

import { modelReplySchema, type ModelReply } from './model-output-schema.ts';
import {
  buildPublicationIdentifiers,
  modelReplyUsesKnownIdentifiers,
} from './publication-identifiers.ts';

export type ModelReplyValidation =
  | { status: 'ok'; reply: ChatReply }
  | { status: 'invalid_output' }
  | { status: 'unknown_identifier' };

export function validateAndNormalizeModelReply(
  output: unknown,
  content: PublicationContent,
  locale: Locale
): ModelReplyValidation {
  const parsed = modelReplySchema.safeParse(output);
  if (!parsed.success) {
    return { status: 'invalid_output' };
  }
  const identifiers = buildPublicationIdentifiers(content);
  if (!modelReplyUsesKnownIdentifiers(parsed.data, identifiers)) {
    return { status: 'unknown_identifier' };
  }
  if (
    parsed.data.outcome === 'sensitive' &&
    (parsed.data.sensitiveTopicSlug === null ||
      !identifiers.sensitiveTopicSlugs.has(parsed.data.sensitiveTopicSlug))
  ) {
    return { status: 'unknown_identifier' };
  }
  return { status: 'ok', reply: normalizeModelReply(parsed.data, content, locale) };
}

function normalizeModelReply(
  modelReply: ModelReply,
  content: PublicationContent,
  locale: Locale
): ChatReply {
  if (modelReply.outcome === 'unknown') {
    return {
      outcome: 'unknown',
      text: content.chatSettings.unknownReply[locale],
      answerSlugs: [],
      blocks: [],
      suggestions: scriptedSuggestionsForOutcome(content, locale, 'unknown'),
    };
  }
  if (modelReply.outcome === 'refused') {
    return {
      outcome: 'refused',
      text: content.chatSettings.refusalReply[locale],
      answerSlugs: [],
      blocks: [],
      suggestions: scriptedSuggestionsForOutcome(content, locale, 'refused'),
    };
  }
  if (modelReply.outcome === 'sensitive') {
    const topic = content.chatSettings.sensitiveTopics.find(
      (candidate) => candidate.slug === modelReply.sensitiveTopicSlug
    );
    if (topic === undefined) {
      throw new Error('Sensitive topic slug was validated but not found in content.');
    }
    return {
      outcome: 'sensitive',
      text: topic.reply[locale],
      answerSlugs: [],
      blocks: [{ type: 'contact' }],
      suggestions: scriptedSuggestionsForOutcome(content, locale, 'sensitive'),
    };
  }
  const distinctBlocks = new Map(modelReply.blocks.map((block) => [JSON.stringify(block), block]));
  return {
    outcome: 'answered',
    text: modelReply.text,
    answerSlugs: [...new Set(modelReply.answerSlugs)],
    blocks: [...distinctBlocks.values()].slice(0, 2),
    suggestions: [...new Set(modelReply.suggestions)].slice(0, 2),
  };
}
