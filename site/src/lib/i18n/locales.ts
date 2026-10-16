import type { Locale } from '@portfolio/content';

export const locales = ['en', 'fr'] satisfies readonly Locale[];

export function localePath(locale: Locale): string {
  if (locale === 'fr') {
    return '/fr';
  }
  return '/';
}

export function openGraphLocale(locale: Locale): string {
  if (locale === 'fr') {
    return 'fr_FR';
  }
  return 'en_US';
}

export function cvFileName(locale: Locale): string {
  return `ny-randriantsarafara-cv-${locale}.pdf`;
}

export function cvPath(locale: Locale): string {
  return `/documents/${cvFileName(locale)}`;
}

export function ogImagePath(locale: Locale): string {
  return `/og/og-${locale}.png`;
}

export function otherLocale(locale: Locale): Locale {
  if (locale === 'fr') {
    return 'en';
  }
  return 'fr';
}

export function privacyPath(locale: Locale): string {
  if (locale === 'fr') {
    return '/fr/confidentialite';
  }
  return '/privacy';
}

export function documentLanguage(locale: Locale): 'en-US' | 'fr' {
  return locale === 'en' ? 'en-US' : 'fr';
}
