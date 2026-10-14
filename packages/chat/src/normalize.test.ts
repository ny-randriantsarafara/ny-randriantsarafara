import { describe, expect, it } from 'vitest';

import { normalizeQuestion } from './normalize.ts';

describe('normalizeQuestion', () => {
  it('lowercases, strips accents and removes English stop words', () => {
    expect(normalizeQuestion('What are your experiences with AWS?', 'en')).toEqual([
      'exper',
      'aws',
    ]);
  });

  it('handles French plurals and stop words', () => {
    const tokens = normalizeQuestion('Quelles sont vos expériences avec les API GraphQL ?', 'fr');
    expect(tokens.some((token) => token.startsWith('exper'))).toBe(true);
    expect(tokens).toContain('api');
    expect(tokens).toContain('graphql');
    expect(tokens.some((token) => token === 'les' || token === 'vos')).toBe(false);
  });

  it('returns empty tokens for stop-word-only input', () => {
    expect(normalizeQuestion('what is the', 'en')).toEqual([]);
  });
});
