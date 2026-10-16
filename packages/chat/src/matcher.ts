import type { Answer, Block, Locale, PublicationContent, SensitiveTopic } from '@portfolio/content';

import type { ChatOutcome, ChatReply } from './contract.ts';
import {
  buildEntityCatalog,
  buildPublishedVocabulary,
  namesUnpublishedOrganization,
  type FocusEntity,
} from './entities.ts';
import { entityCard, focusEntities, resolveFocus, scopeOf } from './focus.ts';
import { detectReplyLanguage } from './language.ts';
import { isManipulationAttempt } from './manipulation-phrases.ts';
import { normalizeQuestion } from './normalize.ts';
import { isOffTaskRequest } from './off-task-requests.ts';
import { clarificationText } from './operational-copy.ts';
import { tokensOverlap } from './overlap.ts';
import { containsPhrase, toPaddedWords } from './phrase-match.ts';
import { scopeOfAnswer, selectBlocks, type BlockScope } from './select-blocks.ts';
import { keywordHasTechnicalReading } from './sensitive-context.ts';

const SAMPLE_WEIGHT = 4;
const TOPIC_WEIGHT = 2;
const TEXT_WEIGHT = 0.5;
const ENTITY_WEIGHT = 3;
const MATCH_THRESHOLD = 3;
const MIN_QUESTION_TOKEN_COVERAGE = 0.2;
const MIN_DEDICATED_TOPICAL_COVERAGE = 0.6;
const MIN_MATCHED_QUESTION_TOKENS = 2;
const MIN_CLOSEST_SAMPLE_SHARE = 0.5;
const MAX_REPLY_BLOCKS = 3;
const MAX_JUXTAPOSED_ENTITIES = 3;

// Words that say what kind of answer is wanted (an overview, a comparison, more detail)
// rather than what it is about.
const NON_TOPICAL_WORDS = {
  en: [
    'role',
    'job',
    'work',
    'worked',
    'working',
    'experience',
    'time',
    'position',
    'responsibilities',
    'contribution',
    'tasks',
    'mission',
    'done',
    'use',
    'used',
    'using',
    'more',
    'details',
    'it',
    'that',
    'there',
    'compare',
    'compared',
    'comparing',
    'comparison',
    'versus',
    'vs',
    'difference',
    'differences',
    'differ',
    'between',
    'better',
    'best',
    'both',
  ],
  fr: [
    'rôle',
    'poste',
    'travail',
    'travaillé',
    'expérience',
    'mission',
    'missions',
    'responsabilités',
    'contribution',
    'tâches',
    'fait',
    'faisais',
    'faites',
    'fais',
    'utilise',
    'utilises',
    'utilisez',
    'utilisé',
    'utiliser',
    'plus',
    'détails',
    'ça',
    'cela',
    'là',
    'comparer',
    'comparez',
    'comparaison',
    'différence',
    'différences',
    'entre',
    'meilleur',
    'mieux',
    'deux',
  ],
};

type IndexedAnswer = {
  answer: Answer;
  order: number;
  sampleQuestionTokens: { en: string[][]; fr: string[][] };
  topicTokens: { en: string[]; fr: string[] };
  textTokens: { en: string[]; fr: string[] };
};

type IndexedSensitiveTopic = {
  topic: SensitiveTopic;
  keywordPhrases: { en: string[]; fr: string[] };
};

type ScoredAnswer = {
  indexed: IndexedAnswer;
  score: number;
  coverage: number;
  matchedTokenCount: number;
  closestSampleShare: number;
};

type MatcherIndex = {
  content: PublicationContent;
  answers: readonly IndexedAnswer[];
  catalog: readonly FocusEntity[];
  nonTopicalTokens: { en: ReadonlySet<string>; fr: ReadonlySet<string> };
};

type MatcherResult = { locale: Locale; reply: ChatReply };

export type MatcherContext = {
  priorVisitorTexts?: readonly string[];
};

export type BlockFocus = { scope: BlockScope; focusCard: Block | null };

export type ScriptedMatcher = {
  reply(question: string, pageLocale: Locale, context?: MatcherContext): MatcherResult;
  blockFocus(question: string, pageLocale: Locale, context?: MatcherContext): BlockFocus | null;
};

export function createScriptedMatcher(content: PublicationContent): ScriptedMatcher {
  const catalog = buildEntityCatalog(content);
  const index: MatcherIndex = {
    content,
    answers: content.answers.map((answer, order) => indexAnswer(answer, order)),
    catalog,
    nonTopicalTokens: {
      en: new Set(NON_TOPICAL_WORDS.en.flatMap((word) => normalizeQuestion(word, 'en'))),
      fr: new Set(NON_TOPICAL_WORDS.fr.flatMap((word) => normalizeQuestion(word, 'fr'))),
    },
  };
  const indexedSensitiveTopics = content.chatSettings.sensitiveTopics.map((topic) =>
    indexSensitiveTopic(topic)
  );
  const technicalContext = [
    ...content.skills.map((skill) => toPaddedWords(skill.name)),
    ...catalog.flatMap((entity) => entity.aliases),
  ];
  const vocabulary = buildPublishedVocabulary(content, catalog);

  return {
    reply(question: string, pageLocale: Locale, context?: MatcherContext) {
      const locale = detectReplyLanguage(question, pageLocale);

      const sensitiveMatch = findSensitiveMatch(
        indexedSensitiveTopics,
        toPaddedWords(question),
        locale,
        technicalContext
      );
      if (sensitiveMatch) {
        return {
          locale,
          reply: {
            text: sensitiveMatch.reply[locale],
            answerSlugs: [],
            blocks: [{ type: 'contact' }],
            suggestions: buildSuggestions(content, locale, null, 'sensitive'),
            outcome: 'sensitive',
          },
        };
      }

      if (
        isManipulationAttempt(question) ||
        isOffTaskRequest(question) ||
        namesUnpublishedOrganization(question, vocabulary)
      ) {
        return unknownReply(content, locale);
      }

      const questionTokens = normalizeQuestion(question, locale);
      const focus = resolveFocus(catalog, question, locale, context?.priorVisitorTexts ?? []);
      switch (focus.kind) {
        case 'ambiguous':
          return clarificationReply(content, locale, null);
        case 'explicit':
          return explicitFocusReply(index, focus.entities, questionTokens, locale);
        case 'inherited':
          return inheritedFocusReply(index, focus.entity, questionTokens, locale);
        case 'none':
          return generalReply(index, questionTokens, locale);
      }
    },

    blockFocus(question: string, pageLocale: Locale, context?: MatcherContext) {
      const locale = detectReplyLanguage(question, pageLocale);
      const focus = resolveFocus(catalog, question, locale, context?.priorVisitorTexts ?? []);
      const entities = focusEntities(focus);
      const scope = scopeOf(entities);
      if (scope === null) {
        return null;
      }
      return { scope, focusCard: singleEntityCard(entities) };
    },
  };
}

// The question names entities: only answers about them qualify, and an answer must also share
// the question's subject. Otherwise an honest unknown beats facts about the right company that
// answer another question.
function explicitFocusReply(
  index: MatcherIndex,
  entities: readonly FocusEntity[],
  questionTokens: readonly string[],
  locale: Locale
): MatcherResult {
  const scope = scopeOf(entities);
  if (scope === null || entities.length > MAX_JUXTAPOSED_ENTITIES) {
    return generalReply(index, questionTokens, locale);
  }
  const focusCard = singleEntityCard(entities);
  const topical = topicalTokens(index, questionTokens, entities, locale);
  if (topical.length === 0) {
    const overview = findOverviewAnswer(index.answers, questionTokens, locale, entities);
    if (overview !== null) {
      return answerReply(index, overview, locale, scope, focusCard);
    }
    return entityOverviewReply(index.content, locale, entities);
  }
  const focused = findFocusedAnswer(index.answers, questionTokens, topical, locale, scope);
  if (focused !== null) {
    return answerReply(index, focused, locale, scope, focusCard);
  }
  return unknownReply(index.content, locale);
}

// A follow-up such as "And the tests?" prefers the entity of the previous question, but falls
// back to a general answer when nothing about that entity fits.
function inheritedFocusReply(
  index: MatcherIndex,
  entity: FocusEntity,
  questionTokens: readonly string[],
  locale: Locale
): MatcherResult {
  const topical = topicalTokens(index, questionTokens, [entity], locale);
  if (topical.length === 0) {
    return clarificationReply(index.content, locale, entity.label[locale]);
  }
  const scope = scopeOf([entity]);
  if (scope === null) {
    return generalReply(index, questionTokens, locale);
  }
  // Scored as if the visitor had repeated the name: "And the tests?" means "the tests at Euronews".
  const contextualTokens = [...questionTokens, ...normalizeQuestion(entity.label[locale], locale)];
  const focused = findFocusedAnswer(index.answers, contextualTokens, topical, locale, scope);
  if (focused !== null) {
    return answerReply(index, focused, locale, scope, entityCard(entity));
  }
  return generalReply(index, questionTokens, locale);
}

function generalReply(
  index: MatcherIndex,
  questionTokens: readonly string[],
  locale: Locale
): MatcherResult {
  const bestAnswer = findBestAnswer(index.answers, questionTokens, locale);
  if (bestAnswer === null) {
    return unknownReply(index.content, locale);
  }
  return answerReply(index, bestAnswer, locale, null, null);
}

function answerReply(
  index: MatcherIndex,
  indexed: IndexedAnswer,
  locale: Locale,
  scope: BlockScope | null,
  focusCard: Block | null
): MatcherResult {
  const { answer } = indexed;
  return {
    locale,
    reply: {
      text: answer.text[locale],
      answerSlugs: [answer.slug],
      blocks: selectBlocks(index.content, {
        candidates: answer.blocks,
        scope,
        figureScope: scopeOfAnswer(index.content, answer.slug),
        focusCard,
        replyAnswerSlugs: [answer.slug],
        limit: MAX_REPLY_BLOCKS,
      }),
      suggestions: buildSuggestions(index.content, locale, answer.slug, 'answered'),
      outcome: 'answered',
    },
  };
}

// Published summaries side by side: used for comparisons and for entities without a written answer.
function entityOverviewReply(
  content: PublicationContent,
  locale: Locale,
  entities: readonly FocusEntity[]
): MatcherResult {
  const summaries = entities.flatMap((entity) => entitySummary(content, entity, locale));
  const cards = entities.flatMap((entity) => {
    const card = entityCard(entity);
    return card === null ? [] : [card];
  });
  if (summaries.length === 0) {
    return unknownReply(content, locale);
  }
  return {
    locale,
    reply: {
      text: summaries.join('\n\n'),
      answerSlugs: [],
      blocks: cards.slice(0, MAX_REPLY_BLOCKS),
      suggestions: buildSuggestions(content, locale, null, 'answered'),
      outcome: 'answered',
    },
  };
}

function entitySummary(content: PublicationContent, entity: FocusEntity, locale: Locale): string[] {
  const experience = content.experiences.find((candidate) =>
    entity.experienceSlugs.includes(candidate.slug)
  );
  if (experience !== undefined) {
    return [`${experience.company} · ${experience.role[locale]}. ${experience.summary[locale]}`];
  }
  const project = content.projects.find((candidate) =>
    entity.projectSlugs.includes(candidate.slug)
  );
  if (project !== undefined) {
    return [`${project.title[locale]}. ${project.summary[locale]}`];
  }
  return [];
}

function singleEntityCard(entities: readonly FocusEntity[]): Block | null {
  const [only, ...others] = entities;
  if (only === undefined || others.length > 0) {
    return null;
  }
  return entityCard(only);
}

function topicalTokens(
  index: MatcherIndex,
  questionTokens: readonly string[],
  entities: readonly FocusEntity[],
  locale: Locale
): string[] {
  const entityTokens = entities.flatMap((entity) =>
    entity.aliases.flatMap((alias) => normalizeQuestion(alias, locale))
  );
  const nonTopical = index.nonTopicalTokens[locale];
  return questionTokens.filter(
    (token) => !nonTopical.has(token) && tokensOverlap([token], entityTokens) === 0
  );
}

function unknownReply(content: PublicationContent, locale: Locale): MatcherResult {
  return {
    locale,
    reply: {
      text: content.chatSettings.unknownReply[locale],
      answerSlugs: [],
      blocks: [],
      suggestions: buildSuggestions(content, locale, null, 'unknown'),
      outcome: 'unknown',
    },
  };
}

function clarificationReply(
  content: PublicationContent,
  locale: Locale,
  subject: string | null
): MatcherResult {
  return {
    locale,
    reply: {
      text: clarificationText(locale, subject),
      answerSlugs: [],
      blocks: [],
      suggestions: buildSuggestions(content, locale, null, 'clarification_required'),
      outcome: 'clarification_required',
    },
  };
}

function indexAnswer(answer: Answer, order: number): IndexedAnswer {
  return {
    answer,
    order,
    sampleQuestionTokens: {
      en: answer.sampleQuestions.en.map((question) => normalizeQuestion(question, 'en')),
      fr: answer.sampleQuestions.fr.map((question) => normalizeQuestion(question, 'fr')),
    },
    topicTokens: {
      en: normalizeQuestion(answer.topic.en, 'en'),
      fr: normalizeQuestion(answer.topic.fr, 'fr'),
    },
    textTokens: {
      en: normalizeQuestion(answer.text.en, 'en'),
      fr: normalizeQuestion(answer.text.fr, 'fr'),
    },
  };
}

function indexSensitiveTopic(topic: SensitiveTopic): IndexedSensitiveTopic {
  return {
    topic,
    keywordPhrases: {
      en: topic.keywords.en.map((keyword) => toPaddedWords(keyword)),
      fr: topic.keywords.fr.map((keyword) => toPaddedWords(keyword)),
    },
  };
}

function findSensitiveMatch(
  topics: readonly IndexedSensitiveTopic[],
  paddedQuestion: string,
  locale: Locale,
  technicalContext: readonly string[]
): SensitiveTopic | null {
  const matched = topics.find((indexed) =>
    indexed.keywordPhrases[locale].some(
      (phrase) =>
        containsPhrase(paddedQuestion, phrase) &&
        !keywordHasTechnicalReading(phrase, paddedQuestion, technicalContext)
    )
  );
  return matched?.topic ?? null;
}

function findOverviewAnswer(
  answers: readonly IndexedAnswer[],
  questionTokens: readonly string[],
  locale: Locale,
  entities: readonly FocusEntity[]
): IndexedAnswer | null {
  const scope = scopeOf(entities);
  if (scope === null) {
    return null;
  }
  const dedicated = answers.filter(
    (indexed) =>
      entities.every((entity) => answerTouches(indexed.answer, scopeOf([entity]))) &&
      extraEntityCount(indexed.answer, scope) === 0
  );
  return bestRanked(dedicated.map((indexed) => scoreAnswer(indexed, questionTokens, locale)));
}

// An answer about the named entities alone, covering most of what is asked, beats one that also
// covers other employers or projects however close its wording. Otherwise every other entity
// an answer brings in costs it the weight of a named entity.
function findFocusedAnswer(
  answers: readonly IndexedAnswer[],
  questionTokens: readonly string[],
  topical: readonly string[],
  locale: Locale,
  scope: BlockScope
): IndexedAnswer | null {
  const touching = answers
    .filter((indexed) => answerTouches(indexed.answer, scope))
    .filter((indexed) => tokensOverlap(topical, answerTokens(indexed, locale)) > 0);
  const dedicated = touching
    .filter((indexed) => extraEntityCount(indexed.answer, scope) === 0)
    .filter(
      (indexed) => questionTokenCoverage(topical, indexed, locale) >= MIN_DEDICATED_TOPICAL_COVERAGE
    )
    .map((indexed) => scoreAnswer(indexed, questionTokens, locale))
    .filter((entry) => entry.score >= MATCH_THRESHOLD);
  const penalized = touching
    .map((indexed) => {
      const scored = scoreAnswer(indexed, questionTokens, locale);
      return {
        ...scored,
        score: scored.score - extraEntityCount(indexed.answer, scope) * ENTITY_WEIGHT,
      };
    })
    .filter((entry) => entry.score >= MATCH_THRESHOLD);
  return bestRanked(dedicated) ?? bestRanked(penalized);
}

function findBestAnswer(
  answers: readonly IndexedAnswer[],
  questionTokens: readonly string[],
  locale: Locale
): IndexedAnswer | null {
  if (questionTokens.length === 0) {
    return null;
  }
  const acceptable = answers
    .map((indexed) => scoreAnswer(indexed, questionTokens, locale))
    .filter((entry) => isConfidentMatch(entry, questionTokens));
  return bestRanked(acceptable);
}

// A single shared word only counts when it repeats most of a short sample question
// ("Présentez-vous" for "Présentez-vous brièvement"). A lone word such as "implement" in
// "How do you implement health checks?" says nothing about what is asked.
function isConfidentMatch(entry: ScoredAnswer, questionTokens: readonly string[]): boolean {
  if (entry.score < MATCH_THRESHOLD || entry.coverage < MIN_QUESTION_TOKEN_COVERAGE) {
    return false;
  }
  const requiredTokens = Math.min(MIN_MATCHED_QUESTION_TOKENS, questionTokens.length);
  if (entry.matchedTokenCount >= requiredTokens) {
    return true;
  }
  return entry.closestSampleShare >= MIN_CLOSEST_SAMPLE_SHARE;
}

// Highest score first; ties keep the publication order of answers.
function bestRanked(entries: readonly ScoredAnswer[]): IndexedAnswer | null {
  const ranked = entries.toSorted(
    (left, right) => right.score - left.score || left.indexed.order - right.indexed.order
  );
  return ranked[0]?.indexed ?? null;
}

function answerTouches(answer: Answer, scope: BlockScope | null): boolean {
  if (scope === null) {
    return false;
  }
  return (
    answer.experienceSlugs.some((slug) => scope.experienceSlugs.includes(slug)) ||
    answer.projectSlugs.some((slug) => scope.projectSlugs.includes(slug))
  );
}

function extraEntityCount(answer: Answer, scope: BlockScope): number {
  return (
    answer.experienceSlugs.filter((slug) => !scope.experienceSlugs.includes(slug)).length +
    answer.projectSlugs.filter((slug) => !scope.projectSlugs.includes(slug)).length
  );
}

function answerTokens(indexed: IndexedAnswer, locale: Locale): string[] {
  return [
    ...indexed.sampleQuestionTokens[locale].flat(),
    ...indexed.topicTokens[locale],
    ...indexed.textTokens[locale],
  ];
}

function scoreAnswer(
  indexed: IndexedAnswer,
  questionTokens: readonly string[],
  locale: Locale
): ScoredAnswer {
  const sampleScores = indexed.sampleQuestionTokens[locale].map((sampleTokens) =>
    tokensOverlap(questionTokens, sampleTokens)
  );
  const sampleScore = sampleScores.reduce((best, score) => (score > best ? score : best), 0);
  const topicScore = tokensOverlap(questionTokens, indexed.topicTokens[locale]);
  const textScore = tokensOverlap(questionTokens, indexed.textTokens[locale]);
  const entityScore = entityOverlap(questionTokens, indexed.answer);
  return {
    indexed,
    score:
      sampleScore * SAMPLE_WEIGHT +
      topicScore * TOPIC_WEIGHT +
      textScore * TEXT_WEIGHT +
      entityScore * ENTITY_WEIGHT,
    coverage: questionTokenCoverage(questionTokens, indexed, locale),
    matchedTokenCount: matchedQuestionTokenCount(questionTokens, indexed, locale),
    closestSampleShare: closestSampleShare(questionTokens, indexed, locale),
  };
}

function questionTokenCoverage(
  questionTokens: readonly string[],
  indexed: IndexedAnswer,
  locale: Locale
): number {
  if (questionTokens.length === 0) {
    return 0;
  }
  return matchedQuestionTokenCount(questionTokens, indexed, locale) / questionTokens.length;
}

function matchedQuestionTokenCount(
  questionTokens: readonly string[],
  indexed: IndexedAnswer,
  locale: Locale
): number {
  const tokens = answerTokens(indexed, locale);
  return questionTokens.filter((questionToken) => tokensOverlap([questionToken], tokens) > 0)
    .length;
}

// Share of the closest sample question's words that the question repeats.
function closestSampleShare(
  questionTokens: readonly string[],
  indexed: IndexedAnswer,
  locale: Locale
): number {
  const shares = indexed.sampleQuestionTokens[locale]
    .filter((sampleTokens) => sampleTokens.length > 0)
    .map((sampleTokens) => tokensOverlap(sampleTokens, questionTokens) / sampleTokens.length);
  return Math.max(0, ...shares);
}

function entityOverlap(questionTokens: readonly string[], answer: Answer): number {
  const entityParts = [...answer.experienceSlugs, ...answer.projectSlugs, answer.slug].flatMap(
    (value) => value.split('-')
  );
  const distinctParts = [...new Set(entityParts.filter((part) => part.length >= 4))];
  return questionTokens.reduce((score, token) => {
    const matched = distinctParts.some(
      (part) => part === token || part.startsWith(token) || token.startsWith(part)
    );
    return score + (matched ? 1 : 0);
  }, 0);
}

export function scriptedSuggestionsForOutcome(
  content: PublicationContent,
  locale: Locale,
  outcome: ChatOutcome,
  matchedAnswerSlug: string | null = null
): string[] {
  return buildSuggestions(content, locale, matchedAnswerSlug, outcome);
}

function buildSuggestions(
  content: PublicationContent,
  locale: Locale,
  matchedSlug: string | null,
  outcome: ChatOutcome
): string[] {
  if (outcome === 'answered') {
    return starterSampleQuestions(content, locale, matchedSlug).slice(0, 3);
  }

  const fromSettings = content.chatSettings.suggestedTopics[locale].slice(0, 3);
  if (fromSettings.length > 0) {
    return fromSettings;
  }
  return starterSampleQuestions(content, locale, matchedSlug).slice(0, 3);
}

function starterSampleQuestions(
  content: PublicationContent,
  locale: Locale,
  excludeSlug: string | null
): string[] {
  return content.answers
    .filter((answer) => answer.starter && answer.slug !== excludeSlug)
    .flatMap((answer) => {
      const first = answer.sampleQuestions[locale][0];
      return first ? [first] : [];
    });
}
