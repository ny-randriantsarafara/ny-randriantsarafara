import type { Answer, Locale, PublicationContent } from '@portfolio/content';

// The follow-ups written for these answers, in their order, without the questions already asked.
export function authoredFollowUps(
  content: PublicationContent,
  locale: Locale,
  answerSlugs: readonly string[],
  askedQuestions: readonly string[]
): string[] {
  const followUps = answerSlugs.flatMap(
    (slug) =>
      content.answers.find((answer) => answer.slug === slug)?.followUpQuestions[locale] ?? []
  );
  return notYetAsked([...new Set(followUps)], askedQuestions);
}

// The prepared answers whose sample question the visitor repeated, such as a clicked suggestion.
export function answersAskedWordForWord(
  content: PublicationContent,
  locale: Locale,
  question: string
): string[] {
  return content.answers
    .filter((answer) => isSampleQuestionOf(answer, question, locale))
    .map((answer) => answer.slug);
}

export function notYetAsked(
  questions: readonly string[],
  askedQuestions: readonly string[]
): string[] {
  return questions.filter((question) => !isAmong(question, askedQuestions));
}

// A clicked suggestion repeats a sample question word for word.
export function isSampleQuestionOf(answer: Answer, question: string, locale: Locale): boolean {
  return isAmong(question, answer.sampleQuestions[locale]);
}

function isAmong(question: string, questions: readonly string[]): boolean {
  const key = questionKey(question);
  return questions.some((candidate) => questionKey(candidate) === key);
}

// Case, apostrophes and the spaces of French punctuation do not make another question.
function questionKey(question: string): string {
  return question
    .trim()
    .replaceAll('’', "'")
    .replace(/\s+/g, ' ')
    .replace(/ ([?!:;])/g, '$1')
    .toLocaleLowerCase();
}
