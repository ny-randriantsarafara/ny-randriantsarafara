import { describe, expect, it } from 'vitest';

import { toPaddedWords } from './phrase-match.ts';
import { keywordHasTechnicalReading } from './sensitive-context.ts';

function technicalReading(keyword: string, question: string, contextTerms: string[] = []) {
  return keywordHasTechnicalReading(
    toPaddedWords(keyword),
    toPaddedWords(question),
    contextTerms.map(toPaddedWords)
  );
}

describe('keywordHasTechnicalReading', () => {
  it('reads a keyword technically next to a technical phrase', () => {
    expect(technicalReading('package', 'Which npm package do you use for validation?')).toBe(true);
    expect(technicalReading('health', 'How do you implement health checks?')).toBe(true);
    expect(technicalReading('hybrid', 'Have you designed a hybrid cloud architecture?')).toBe(true);
    expect(technicalReading('contract', 'How do you test API contracts?')).toBe(true);
    expect(technicalReading('pay', 'How do you pay down technical debt?')).toBe(true);
    expect(technicalReading('sante', 'Comment surveilles-tu la santé de tes services ?')).toBe(
      true
    );
  });

  it('reads a keyword technically next to a published skill or employer', () => {
    expect(technicalReading('vote', 'Do you vote for GraphQL or REST?', ['GraphQL'])).toBe(true);
  });

  it('keeps the personal reading whenever a personal phrase is present', () => {
    expect(technicalReading('package', 'What salary package do you expect?')).toBe(false);
    expect(technicalReading('health', 'Do you have health issues with your services?')).toBe(false);
    expect(technicalReading('remote', 'Are you open to remote work on API teams?')).toBe(false);
    expect(technicalReading('hybrid', 'Would you accept a hybrid cloud role?')).toBe(false);
  });

  it('keeps the personal reading without any technical context', () => {
    expect(technicalReading('health', 'How is your health?')).toBe(false);
    expect(technicalReading('remote', 'Remote?')).toBe(false);
  });

  it('never overrides keywords outside the ambiguity table', () => {
    expect(technicalReading('salary', 'Which npm salary library do you use?')).toBe(false);
  });
});
