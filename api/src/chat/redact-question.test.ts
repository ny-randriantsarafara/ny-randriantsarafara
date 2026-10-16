import { describe, expect, it } from 'vitest';

import { redactQuestion } from './redact-question.ts';

describe('redactQuestion', () => {
  it('keeps an ordinary question as asked', () => {
    const question = 'What did you deliver at Euronews between 2019-2024 for ~2M users?';
    expect(redactQuestion(question)).toBe(question);
  });

  it('removes email addresses', () => {
    expect(redactQuestion('Reply to jane.doe+jobs@example.co.uk please')).toBe(
      'Reply to [email] please'
    );
  });

  it.each([
    ['Call me on 06 12 34 56 78', 'Call me on [number]'],
    ['Mon numéro : +33 (0)6.12.34.56.78', 'Mon numéro : [number]'],
    ['IBAN FR7630006000011234567890189', 'IBAN [credential]'],
  ])('removes long numbers from "%s"', (question, redacted) => {
    expect(redactQuestion(question)).toBe(redacted);
  });

  it('removes pasted credentials', () => {
    expect(redactQuestion('My key is sk-proj-4fT9qL2mZx8VbN3cR7wY1pKd, does it work?')).toBe(
      'My key is [credential], does it work?'
    );
  });

  it('keeps long words without digits', () => {
    const question = 'How do you approach internationalization and observability-driven delivery?';
    expect(redactQuestion(question)).toBe(question);
  });
});
