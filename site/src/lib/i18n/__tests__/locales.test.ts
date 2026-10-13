import { describe, expect, it } from 'vitest';

import {
  cvFileName,
  cvPath,
  localePath,
  locales,
  ogImagePath,
  openGraphLocale,
  otherLocale,
} from '../locales.ts';

describe('locales', () => {
  it('lists both site locales', () => {
    expect(locales).toEqual(['en', 'fr']);
  });

  it('maps locale paths and Open Graph locales', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('fr')).toBe('/fr');
    expect(openGraphLocale('en')).toBe('en_US');
    expect(openGraphLocale('fr')).toBe('fr_FR');
  });

  it('builds asset paths', () => {
    expect(cvFileName('en')).toBe('ny-randriantsarafara-cv-en.pdf');
    expect(cvPath('fr')).toBe('/documents/ny-randriantsarafara-cv-fr.pdf');
    expect(ogImagePath('en')).toBe('/og/og-en.png');
  });

  it('returns the alternate locale', () => {
    expect(otherLocale('en')).toBe('fr');
    expect(otherLocale('fr')).toBe('en');
  });
});
