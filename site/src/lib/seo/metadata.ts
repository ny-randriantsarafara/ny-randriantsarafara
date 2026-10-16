import { dictionaryFor } from '../i18n/dictionary.ts';
import { localePath, ogImagePath, openGraphLocale } from '../i18n/locales.ts';

import { getSiteUrl } from './site-url.ts';

import type { ActivePublication, Locale } from '@portfolio/content';
import type { Metadata, Viewport } from 'next';

const lightThemeColor = '#f5f5f7';
const darkThemeColor = '#09090b';

function localizedTitle(publication: ActivePublication, locale: Locale): string {
  return publication.content.siteSettings.title[locale];
}

function localizedDescription(publication: ActivePublication, locale: Locale): string {
  return publication.content.siteSettings.description[locale];
}

export function buildMetadata(publication: ActivePublication, locale: Locale): Metadata {
  const siteUrl = getSiteUrl();
  const profile = publication.content.profile;
  const canonicalPath = localePath(locale);
  const title = localizedTitle(publication, locale);
  const description = localizedDescription(publication, locale);
  const alternateLocale = locale === 'en' ? 'fr_FR' : 'en_US';
  const social = dictionaryFor(locale).og;

  return {
    metadataBase: siteUrl,
    title,
    description,
    authors: [{ name: profile.name }],
    creator: profile.name,
    alternates: {
      canonical: canonicalPath,
      languages: {
        'en-US': '/',
        fr: '/fr',
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      url: new URL(canonicalPath, siteUrl).toString(),
      siteName: profile.name,
      locale: openGraphLocale(locale),
      alternateLocale: [alternateLocale],
      title: social.title,
      description: social.tagline,
      images: [
        {
          url: ogImagePath(locale),
          width: 1200,
          height: 630,
          alt: social.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: social.title,
      description: social.tagline,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildViewport(): Viewport {
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: lightThemeColor },
      { media: '(prefers-color-scheme: dark)', color: darkThemeColor },
    ],
  };
}
