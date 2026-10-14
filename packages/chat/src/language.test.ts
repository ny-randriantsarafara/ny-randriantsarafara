import { describe, expect, it } from 'vitest';

import { detectReplyLanguage } from './language.ts';

describe('detectReplyLanguage', () => {
  it('detects clear English', () => {
    expect(detectReplyLanguage('What is your experience with AWS and GraphQL APIs?', 'fr')).toBe(
      'en'
    );
  });

  it('detects clear French', () => {
    expect(
      detectReplyLanguage(
        'Quelle est votre expérience avec les API GraphQL et l’infrastructure cloud ?',
        'en'
      )
    ).toBe('fr');
  });

  it('uses accented characters as a French signal', () => {
    expect(detectReplyLanguage('Parlez-moi de votre parcours professionnel.', 'en')).toBe('fr');
  });

  it('falls back on short or ambiguous input', () => {
    expect(detectReplyLanguage('AWS GraphQL', 'fr')).toBe('fr');
    expect(detectReplyLanguage('ok', 'en')).toBe('en');
  });
});
