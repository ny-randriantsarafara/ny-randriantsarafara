import { describe, expect, it } from 'vitest';

import { cvLocale, ogImageLocale } from '../og-image-locale.ts';

describe('ogImageLocale', () => {
  it('maps known filenames to locales', () => {
    expect(ogImageLocale('og-en.png')).toBe('en');
    expect(ogImageLocale('og-fr.png')).toBe('fr');
  });

  it('throws for unknown filenames', () => {
    expect(() => ogImageLocale('missing.png')).toThrow(/Unknown OG image/);
  });
});

describe('cvLocale', () => {
  it('maps CV filenames to locales', () => {
    expect(cvLocale('ny-randriantsarafara-cv-en.pdf')).toBe('en');
    expect(cvLocale('ny-randriantsarafara-cv-fr.pdf')).toBe('fr');
  });
});
