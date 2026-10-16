import { contentFixture, journeyAnswer } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { authoredFollowUps, isSampleQuestionOf } from './follow-ups.ts';

describe('authoredFollowUps', () => {
  it('returns the follow-ups written for the answers in the reply language', () => {
    expect(authoredFollowUps(contentFixture, 'fr', ['journey', 'why-me'], [])).toEqual([
      'Pourquoi vous recruter ?',
    ]);
  });

  it('leaves out a follow-up the visitor already asked', () => {
    expect(
      authoredFollowUps(contentFixture, 'fr', ['journey'], ['pourquoi vous recruter?'])
    ).toEqual([]);
  });

  it('lists a follow-up shared by two answers once', () => {
    const content = {
      ...contentFixture,
      answers: contentFixture.answers.map((answer) => ({
        ...answer,
        followUpQuestions: journeyAnswer.followUpQuestions,
      })),
    };
    expect(authoredFollowUps(content, 'en', ['journey', 'why-me'], [])).toEqual([
      'Why should we hire you?',
    ]);
  });

  it('ignores answers that are not published', () => {
    expect(authoredFollowUps(contentFixture, 'en', ['missing'], [])).toEqual([]);
  });
});

describe('isSampleQuestionOf', () => {
  it('recognizes a sample question whatever its case, apostrophes and spaces', () => {
    expect(isSampleQuestionOf(journeyAnswer, '  parle-moi de ton parcours ', 'fr')).toBe(true);
    expect(isSampleQuestionOf(journeyAnswer, 'Parle-moi de ton parcours', 'en')).toBe(false);
    expect(isSampleQuestionOf(journeyAnswer, 'Parle-moi de ton parcours pro', 'fr')).toBe(false);
  });
});
