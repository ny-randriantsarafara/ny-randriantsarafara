import type {
  Answer,
  ChatReply,
  Locale,
  PublicationContent,
  SensitiveTopic,
} from '@portfolio/content';

import type { ChatOutcome } from './contract.ts';
import { detectReplyLanguage } from './language.ts';
import { normalizeQuestion } from './normalize.ts';
import { tokensOverlap } from './overlap.ts';

const SAMPLE_WEIGHT = 3;
const TOPIC_WEIGHT = 1.5;
const TEXT_WEIGHT = 0.75;
const MATCH_THRESHOLD = 2;

type IndexedAnswer = {
  answer: Answer;
  sampleTokens: { en: string[]; fr: string[] };
  topicTokens: { en: string[]; fr: string[] };
  textTokens: { en: string[]; fr: string[] };
};

type IndexedSensitiveTopic = {
  topic: SensitiveTopic;
  keywordTokenGroups: { en: string[][]; fr: string[][] };
};

export type ScriptedMatcher = {
  reply(question: string, pageLocale: Locale): { locale: Locale; reply: ChatReply };
};

export function createScriptedMatcher(content: PublicationContent): ScriptedMatcher {
  const indexedAnswers = content.answers.map((answer) => indexAnswer(answer));
  const indexedSensitiveTopics = content.chatSettings.sensitiveTopics.map((topic) =>
    indexSensitiveTopic(topic)
  );

  return {
    reply(question: string, pageLocale: Locale) {
      const locale = detectReplyLanguage(question, pageLocale);
      const questionTokens = normalizeQuestion(question, locale);

      const sensitiveMatch = findSensitiveMatch(indexedSensitiveTopics, questionTokens, locale);
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

      const bestAnswer = findBestAnswer(indexedAnswers, questionTokens, locale);
      if (bestAnswer) {
        return {
          locale,
          reply: {
            text: bestAnswer.answer.text[locale],
            answerSlugs: [bestAnswer.answer.slug],
            blocks: bestAnswer.answer.blocks,
            suggestions: buildSuggestions(content, locale, bestAnswer.answer.slug, 'answered'),
            outcome: 'answered',
          },
        };
      }

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
    },
  };
}

function indexAnswer(answer: Answer): IndexedAnswer {
  return {
    answer,
    sampleTokens: {
      en: answer.sampleQuestions.en.flatMap((question) => normalizeQuestion(question, 'en')),
      fr: answer.sampleQuestions.fr.flatMap((question) => normalizeQuestion(question, 'fr')),
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
    keywordTokenGroups: {
      en: topic.keywords.en.map((keyword) => normalizeKeywordPhrase(keyword, 'en')),
      fr: topic.keywords.fr.map((keyword) => normalizeKeywordPhrase(keyword, 'fr')),
    },
  };
}

function normalizeKeywordPhrase(keyword: string, locale: Locale): string[] {
  return normalizeQuestion(keyword, locale);
}

function findSensitiveMatch(
  topics: readonly IndexedSensitiveTopic[],
  questionTokens: readonly string[],
  locale: Locale
): SensitiveTopic | null {
  for (const indexed of topics) {
    const groups = indexed.keywordTokenGroups[locale];
    const matched = groups.some((group) => keywordGroupMatches(questionTokens, group));
    if (matched) {
      return indexed.topic;
    }
  }
  return null;
}

function keywordGroupMatches(
  questionTokens: readonly string[],
  keywordTokens: readonly string[]
): boolean {
  if (keywordTokens.length === 0) {
    return false;
  }
  if (keywordTokens.length === 1) {
    const onlyToken = keywordTokens[0];
    if (!onlyToken) {
      return false;
    }
    return questionTokens.some((token) => tokensOverlap([token], [onlyToken]) > 0);
  }

  return keywordTokens.every((keywordToken) =>
    questionTokens.some((questionToken) => tokensOverlap([questionToken], [keywordToken]) > 0)
  );
}

function findBestAnswer(
  answers: readonly IndexedAnswer[],
  questionTokens: readonly string[],
  locale: Locale
): IndexedAnswer | null {
  const scored = answers
    .map((indexed) => ({
      indexed,
      score: scoreAnswer(indexed, questionTokens, locale),
    }))
    .filter((entry) => entry.score >= MATCH_THRESHOLD)
    .sort((left, right) => right.score - left.score);

  const top = scored[0];
  if (!top) {
    return null;
  }

  const tied = scored.filter((entry) => entry.score === top.score);
  if (tied.length === 1) {
    return top.indexed;
  }

  const firstInContentOrder = tied
    .map((entry) => entry.indexed)
    .sort(
      (left, right) =>
        answers.findIndex((candidate) => candidate.answer.slug === left.answer.slug) -
        answers.findIndex((candidate) => candidate.answer.slug === right.answer.slug)
    )[0];

  return firstInContentOrder ?? null;
}

function scoreAnswer(
  indexed: IndexedAnswer,
  questionTokens: readonly string[],
  locale: Locale
): number {
  const sampleScore = tokensOverlap(questionTokens, indexed.sampleTokens[locale]) * SAMPLE_WEIGHT;
  const topicScore = tokensOverlap(questionTokens, indexed.topicTokens[locale]) * TOPIC_WEIGHT;
  const textScore = tokensOverlap(questionTokens, indexed.textTokens[locale]) * TEXT_WEIGHT;
  return sampleScore + topicScore + textScore;
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
