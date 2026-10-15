import { containsPhrase, toPaddedWords } from './phrase-match.ts';

// Whole-phrase matches only: a phrase that is also an ordinary recruiter question
// ("did you act as tech lead", "il joue le rôle de lead") must not be listed.
// Both languages are checked whatever the reply language, so a mixed-language attempt still matches.
const manipulationPhrases = [
  'ignore previous instructions',
  'ignore all previous instructions',
  'ignore your instructions',
  'ignore the above',
  'disregard your instructions',
  'disregard previous instructions',
  'forget your instructions',
  'forget your rules',
  'you are now a',
  'you are now an',
  'pretend to be',
  'pretend you are',
  'act as if you',
  'roleplay as',
  'system prompt',
  'ignorez vos consignes',
  'ignorez vos instructions',
  'ignorez les instructions précédentes',
  'ignore tes consignes',
  'ignore tes instructions',
  'oubliez vos règles',
  'oublie tes règles',
  'vous êtes maintenant un',
  'vous êtes maintenant une',
  'tu es maintenant un',
  'tu es maintenant une',
  'faites comme si vous',
  'fais comme si tu',
  'prétendez être',
  'prompt système',
];

const paddedPhrases = manipulationPhrases.map((phrase) => toPaddedWords(phrase));

export function isManipulationAttempt(question: string): boolean {
  const paddedQuestion = toPaddedWords(question);
  return paddedPhrases.some((phrase) => containsPhrase(paddedQuestion, phrase));
}
