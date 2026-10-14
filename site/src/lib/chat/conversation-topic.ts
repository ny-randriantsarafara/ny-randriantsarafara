import type { ConversationTurn } from '@/lib/chat/conversation-reducer.ts';
import type { Locale, PublicationContent } from '@portfolio/content';

function localized(text: { en: string; fr: string }, locale: Locale): string {
  return text[locale];
}

function trimTopic(text: string): string {
  return text.trim().slice(0, 200);
}

function topicFromLatestAnswer(
  turns: readonly ConversationTurn[],
  content: PublicationContent,
  locale: Locale
): string | null {
  const reversed = [...turns].reverse();
  const assistantTurn = reversed.find(
    (turn) => turn.role === 'assistant' && turn.message.text.length > 0
  );
  if (assistantTurn === undefined || assistantTurn.role !== 'assistant') {
    return null;
  }
  const slug = assistantTurn.message.answerSlugs[0];
  if (slug === undefined) {
    return trimTopic(assistantTurn.message.text);
  }
  const answer = content.answers.find((item) => item.slug === slug);
  if (answer === undefined) {
    return trimTopic(assistantTurn.message.text);
  }
  return trimTopic(localized(answer.topic, locale));
}

function topicFromLastQuestion(turns: readonly ConversationTurn[]): string | null {
  const reversed = [...turns].reverse();
  const visitorTurn = reversed.find((turn) => turn.role === 'visitor');
  if (visitorTurn === undefined || visitorTurn.role !== 'visitor') {
    return null;
  }
  return trimTopic(visitorTurn.message.text);
}

export function deriveConversationTopic(
  turns: readonly ConversationTurn[],
  content: PublicationContent | null,
  locale: Locale
): string | undefined {
  if (content !== null) {
    const fromAnswer = topicFromLatestAnswer(turns, content, locale);
    if (fromAnswer !== null && fromAnswer.length > 0) {
      return fromAnswer;
    }
  }
  const fromQuestion = topicFromLastQuestion(turns);
  if (fromQuestion !== null && fromQuestion.length > 0) {
    return fromQuestion;
  }
  return undefined;
}
