import { scriptedSuggestionsForOutcome } from '@portfolio/chat';
import type { ChatReply } from '@portfolio/chat';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

import { buildEvidenceSources, resolveEvidence, type EvidenceSource } from './evidence.ts';
import { modelReplySchema, type ModelReply } from './model-output-schema.ts';
import { buildPublicationIdentifiers } from './publication-identifiers.ts';

export type ModelReplyValidation =
  | { status: 'ok'; reply: ChatReply }
  | { status: 'invalid_output' }
  | { status: 'unknown_identifier' }
  | { status: 'invalid_evidence' };

export function validateAndNormalizeModelReply(
  output: unknown,
  content: PublicationContent,
  locale: Locale,
  evidenceSources?: ReadonlyMap<string, EvidenceSource>
): ModelReplyValidation {
  const parsed = modelReplySchema.safeParse(output);
  if (!parsed.success) {
    return { status: 'invalid_output' };
  }
  const identifiers = buildPublicationIdentifiers(content);
  if (
    parsed.data.outcome === 'sensitive' &&
    (parsed.data.sensitiveTopicSlug === null ||
      !identifiers.sensitiveTopicSlugs.has(parsed.data.sensitiveTopicSlug))
  ) {
    return { status: 'unknown_identifier' };
  }
  const evidence = resolveEvidence(
    parsed.data.evidence,
    evidenceSources ??
      new Map(buildEvidenceSources(content, locale).map((source) => [source.id, source]))
  );
  if (
    evidence.status !== 'ok' ||
    (parsed.data.outcome === 'answered' && evidence.sources.length === 0)
  )
    return { status: 'invalid_evidence' };
  return {
    status: 'ok',
    reply: normalizeModelReply(parsed.data, content, locale, evidence.sources),
  };
}

function normalizeModelReply(
  modelReply: ModelReply,
  content: PublicationContent,
  locale: Locale,
  sources: EvidenceSource[]
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
  const distinctBlocks = new Map<string, Block>();
  for (const source of sources)
    if (source.block !== null) distinctBlocks.set(JSON.stringify(source.block), source.block);
  return {
    outcome: 'answered',
    text: modelReply.text,
    answerSlugs: [
      ...new Set(
        sources.flatMap((source) =>
          source.collection === 'answers' && source.entitySlug !== null ? [source.entitySlug] : []
        )
      ),
    ],
    blocks: [...distinctBlocks.values()].slice(0, 2),
    suggestions: [...new Set(modelReply.suggestions)].slice(0, 2),
  };
}
