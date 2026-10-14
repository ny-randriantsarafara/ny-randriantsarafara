import type { Locale } from '@portfolio/content';

export function localized(text: { en: string; fr: string }, locale: Locale): string {
  return text[locale];
}

export function localizedBullets(
  list: { en: readonly string[]; fr: readonly string[] },
  locale: Locale
) {
  if (locale === 'fr') {
    return list.fr;
  }
  return list.en;
}
