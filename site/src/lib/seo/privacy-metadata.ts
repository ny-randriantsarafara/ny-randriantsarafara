import { privacyPath } from '../i18n/locales.ts';

import { getSiteUrl } from './site-url.ts';

import type { Locale } from '@portfolio/content';
import type { Metadata } from 'next';

export function buildPrivacyMetadata(locale: Locale, title: string, description: string): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalPath = privacyPath(locale);
  const alternateLocale = locale === 'en' ? 'fr' : 'en';

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: privacyPath('en'),
        fr: privacyPath('fr'),
        'x-default': privacyPath('en'),
      },
    },
    openGraph: {
      type: 'website',
      url: new URL(canonicalPath, siteUrl).toString(),
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      alternateLocale: [alternateLocale === 'fr' ? 'fr_FR' : 'en_US'],
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function privacyPathsForSitemap(baseUrl: string, lastModified: Date) {
  return (['en', 'fr'] as const).map((locale) => ({
    url: `${baseUrl}${privacyPath(locale)}`,
    lastModified,
    changeFrequency: 'yearly' as const,
    priority: 0.5,
    alternates: {
      languages: {
        en: `${baseUrl}${privacyPath('en')}`,
        fr: `${baseUrl}${privacyPath('fr')}`,
        'x-default': `${baseUrl}${privacyPath('en')}`,
      },
    },
  }));
}
