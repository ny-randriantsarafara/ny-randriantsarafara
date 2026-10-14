import type { Locale } from '@portfolio/content';

import { englishStopWords, frenchStopWords } from './stop-words.ts';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zàâäæçéèêëîïôœùûüÿ]+/i)
    .filter((token) => token.length > 0);
}

function countStopWords(tokens: readonly string[], stopWords: ReadonlySet<string>): number {
  return tokens.reduce((count, token) => count + (stopWords.has(token) ? 1 : 0), 0);
}

function hasFrenchAccentSignal(text: string): boolean {
  return /[àâäæçéèêëîïôœùûüÿ]/i.test(text);
}

export function detectReplyLanguage(text: string, fallbackLocale: Locale): Locale {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return fallbackLocale;
  }

  const englishScore = countStopWords(tokens, englishStopWords);
  const frenchScore =
    countStopWords(tokens, frenchStopWords) + (hasFrenchAccentSignal(text) ? 2 : 0);

  if (englishScore === frenchScore) {
    return fallbackLocale;
  }
  return englishScore > frenchScore ? 'en' : 'fr';
}
