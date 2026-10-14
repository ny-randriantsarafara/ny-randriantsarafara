import type { Locale, PublicationContent } from '@portfolio/content';

import { normalizeQuestion } from '../src/normalize.ts';

const OVERLAP_THRESHOLD = 0.85;

export function normalizedQuestionTokens(text: string, locale: Locale): string[] {
  return normalizeQuestion(text, locale).toSorted((left, right) => left.localeCompare(right));
}

export function tokenJaccard(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersectionSize = [...leftSet].filter((token) => rightSet.has(token)).length;
  const unionSize = new Set([...leftSet, ...rightSet]).size;
  return intersectionSize / unionSize;
}

export function evalQuestionOverlapsSampleQuestion(
  question: string,
  locale: Locale,
  content: PublicationContent
): boolean {
  const questionTokens = normalizedQuestionTokens(question, locale);
  return content.answers.some((answer) =>
    answer.sampleQuestions[locale].some((sample) => {
      const sampleTokens = normalizedQuestionTokens(sample, locale);
      if (questionTokens.join('\0') === sampleTokens.join('\0')) {
        return true;
      }
      return tokenJaccard(questionTokens, sampleTokens) >= OVERLAP_THRESHOLD;
    })
  );
}
