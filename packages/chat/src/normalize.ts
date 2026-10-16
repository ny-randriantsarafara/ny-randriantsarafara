import type { Locale } from '@portfolio/content';

import { englishStopWords, frenchStopWords } from './stop-words.ts';

export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

// Tokens lose their accents before the lookup, so the stop words must lose theirs too.
const unaccentedStopWords = {
  en: new Set([...englishStopWords].map((word) => removeAccents(word))),
  fr: new Set([...frenchStopWords].map((word) => removeAccents(word))),
};

function stopWordsFor(locale: Locale): ReadonlySet<string> {
  return unaccentedStopWords[locale];
}

function lightStem(token: string, locale: Locale): string {
  if (token.length <= 3) {
    return token;
  }

  const englishSuffixes = [
    'ations',
    'ation',
    'iences',
    'ience',
    'ments',
    'ment',
    'ness',
    'ings',
    'ing',
    'ies',
    'es',
    's',
  ];
  const frenchSuffixes = [
    'ements',
    'ement',
    'ations',
    'ation',
    'ments',
    'ment',
    'eux',
    'aux',
    'ees',
    'ee',
    'es',
    's',
  ];

  const suffixes = locale === 'en' ? englishSuffixes : frenchSuffixes;
  const matched = suffixes.find(
    (suffix) => token.length > suffix.length + 2 && token.endsWith(suffix)
  );
  if (matched) {
    return token.slice(0, token.length - matched.length);
  }
  return token;
}

export function normalizeQuestion(text: string, locale: Locale): string[] {
  const stopWords = stopWordsFor(locale);
  const rawTokens = removeAccents(text.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);

  return rawTokens
    .filter((token) => !stopWords.has(token))
    .map((token) => lightStem(token, locale))
    .filter((token) => token.length > 0);
}
