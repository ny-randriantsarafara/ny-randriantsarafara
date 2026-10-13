import { cvFileName } from './locales.ts';

import type { Locale } from '@portfolio/content';

export function ogImageLocale(file: string): Locale {
  if (file === 'og-en.png') {
    return 'en';
  }
  if (file === 'og-fr.png') {
    return 'fr';
  }
  throw new Error(`Unknown OG image file: ${file}`);
}

export function ogImageFiles(): readonly string[] {
  return ['og-en.png', 'og-fr.png'];
}

export function cvLocale(file: string): Locale {
  if (file === cvFileName('en')) {
    return 'en';
  }
  if (file === cvFileName('fr')) {
    return 'fr';
  }
  throw new Error(`Unknown CV file: ${file}`);
}
