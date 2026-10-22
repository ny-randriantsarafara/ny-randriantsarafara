import {
  answersAskedWordForWord,
  authoredFollowUps,
  buildEntityCatalog,
  scriptedSuggestionsForOutcome,
  selectBlocks,
  type BlockFocus,
  type ChatReply,
  type FocusEntity,
} from '@portfolio/chat';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

import { citedScope } from './cited-scope.ts';
import {
  buildEvidenceSources,
  resolveEvidence,
  type EvidenceSource,
  type EvidenceReference,
} from './evidence.ts';
import { modelReplySchema, type ModelReply } from './model-output-schema.ts';
import { buildPublicationIdentifiers } from './publication-identifiers.ts';
import { replyClaimProblems, type ClaimProblem } from './reply-claims.ts';

const MAX_MODEL_REPLY_BLOCKS = 2;
const MAX_MODEL_SUGGESTIONS = 2;

export type ModelReplyValidation =
  | { status: 'ok'; reply: ChatReply; evidenceReferences: EvidenceReference[] }
  | { status: 'invalid_output' }
  | { status: 'unknown_identifier' }
  | { status: 'invalid_evidence' }
  | {
      status: 'unsupported_claims';
      problems: readonly ClaimProblem[];
      evidenceReferences: EvidenceReference[];
    };

export type ModelReplyContext = {
  evidenceSources?: ReadonlyMap<string, EvidenceSource>;
  entityCatalog?: readonly FocusEntity[];
  // Entities the visitor's question is about, resolved against the conversation.
  questionFocus?: BlockFocus | null;
  // The visitor's question this reply answers.
  question?: string;
  // The visitor's questions so far, this one included.
  askedQuestions?: readonly string[];
};

export function validateAndNormalizeModelReply(
  output: unknown,
  content: PublicationContent,
  locale: Locale,
  context: ModelReplyContext = {}
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
    context.evidenceSources ??
      new Map(buildEvidenceSources(content, locale).map((source) => [source.id, source]))
  );
  if (
    evidence.status !== 'ok' ||
    (parsed.data.outcome === 'answered' && evidence.sources.length === 0)
  ) {
    return { status: 'invalid_evidence' };
  }
  const problems = claimProblems(
    parsed.data,
    content,
    evidence.sources,
    context.entityCatalog ?? buildEntityCatalog(content),
    context.question ?? ''
  );
  if (problems.length > 0) {
    return { status: 'unsupported_claims', problems, evidenceReferences: parsed.data.evidence };
  }
  return {
    status: 'ok',
    evidenceReferences: parsed.data.evidence,
    reply: normalizeModelReply(parsed.data, content, locale, evidence.sources, {
      questionFocus: context.questionFocus ?? null,
      question: context.question ?? '',
      askedQuestions: context.askedQuestions ?? [],
    }),
  };
}

type ConversationState = {
  questionFocus: BlockFocus | null;
  question: string;
  askedQuestions: readonly string[];
};

function claimProblems(
  modelReply: ModelReply,
  content: PublicationContent,
  sources: EvidenceSource[],
  catalog: readonly FocusEntity[],
  question: string
): ClaimProblem[] {
  if (modelReply.outcome !== 'answered' && modelReply.outcome !== 'clarification_required') {
    return [];
  }
  return replyClaimProblems({
    text: modelReply.text,
    sources,
    content,
    catalog,
    entitiesMustBeCited: modelReply.outcome === 'answered',
    question,
  });
}

function normalizeModelReply(
  modelReply: ModelReply,
  content: PublicationContent,
  locale: Locale,
  sources: EvidenceSource[],
  conversation: ConversationState
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
  if (modelReply.outcome === 'clarification_required') {
    return {
      outcome: 'clarification_required',
      text: modelReply.text,
      answerSlugs: [],
      blocks: [],
      suggestions: [...new Set(modelReply.suggestions)].slice(0, MAX_MODEL_SUGGESTIONS),
    };
  }
  const answerSlugs = citedAnswerSlugs(sources);
  const { questionFocus, question, askedQuestions } = conversation;
  // A written follow-up has an answer prepared for it; a question the model makes up may not.
  // A repeated sample question keeps the follow-ups written for it, even when the model cites
  // other sources than its prepared answer.
  const followUps = authoredFollowUps(
    content,
    locale,
    [...answersAskedWordForWord(content, locale, question), ...answerSlugs],
    askedQuestions
  );
  return {
    outcome: 'answered',
    text: modelReply.text,
    answerSlugs,
    blocks: selectBlocks(content, {
      candidates: candidateBlocks(content, sources),
      scope: questionFocus?.scope ?? null,
      figureScope: citedScope(content, sources),
      focusCard: questionFocus?.focusCard ?? null,
      replyAnswerSlugs: answerSlugs,
      limit: MAX_MODEL_REPLY_BLOCKS,
    }),
    suggestions: [...new Set([...followUps, ...modelReply.suggestions])].slice(
      0,
      MAX_MODEL_SUGGESTIONS
    ),
  };
}

function citedAnswerSlugs(sources: readonly EvidenceSource[]): string[] {
  return [
    ...new Set(
      sources.flatMap((source) =>
        source.collection === 'answers' && source.entitySlug !== null ? [source.entitySlug] : []
      )
    ),
  ];
}

// A cited prepared answer brings the cards its author chose for it, not a card of its own text.
function candidateBlocks(content: PublicationContent, sources: readonly EvidenceSource[]): Block[] {
  return sources.flatMap((source) => {
    if (source.collection !== 'answers') {
      return source.block === null ? [] : [source.block];
    }
    const answer = content.answers.find((candidate) => candidate.slug === source.entitySlug);
    return answer === undefined ? [] : answer.blocks;
  });
}
