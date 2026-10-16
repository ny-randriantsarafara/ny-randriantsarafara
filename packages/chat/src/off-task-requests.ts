import { containsPhrase, toPaddedWords } from './phrase-match.ts';

// Creative or general-purpose tasks outside the portfolio. Words with a professional reading
// ("story", "translate", "write") are left out: they also appear in recruiter questions.
const offTaskPhrases = [
  'poem',
  'poems',
  'haiku',
  'joke',
  'jokes',
  'recipe',
  'recipes',
  'song',
  'lyrics',
  'write me',
  'poeme',
  'poemes',
  'blague',
  'blagues',
  'recette',
  'recettes',
  'chanson',
  'ecris moi',
  'ecrivez moi',
];

const paddedPhrases = offTaskPhrases.map((phrase) => toPaddedWords(phrase));

export function isOffTaskRequest(question: string): boolean {
  const paddedQuestion = toPaddedWords(question);
  return paddedPhrases.some((phrase) => containsPhrase(paddedQuestion, phrase));
}
