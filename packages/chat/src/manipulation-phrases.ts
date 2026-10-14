import type { Locale } from '@portfolio/content';

const englishManipulationPhrases = [
  'ignore previous instructions',
  'ignore your instructions',
  'disregard your instructions',
  'you are now',
  'pretend to be',
  'act as',
  'forget your rules',
];

const frenchManipulationPhrases = [
  'ignorez vos consignes',
  'ignorez vos instructions',
  'oubliez vos règles',
  'vous êtes maintenant',
  'faissez comme si',
  'prétendez être',
  'jouez le rôle',
];

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isManipulationAttempt(question: string, locale: Locale): boolean {
  const normalizedQuestion = collapseWhitespace(question);
  const phrases = locale === 'en' ? englishManipulationPhrases : frenchManipulationPhrases;
  return phrases.some((phrase) => normalizedQuestion.includes(phrase));
}

export function manipulationPhrasesFor(locale: Locale): readonly string[] {
  return locale === 'en' ? englishManipulationPhrases : frenchManipulationPhrases;
}
