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

// Shared links show the share texts, or the page title and description without them.
export function shareTitle(publication: ActivePublication, locale: Locale): string {
  const settings = publication.content.siteSettings;
  if (settings.shareTitle === null) {
    return localizedTitle(publication, locale);
  }
  return settings.shareTitle[locale];
}

export function shareDescription(publication: ActivePublication, locale: Locale): string {
  const settings = publication.content.siteSettings;
  if (settings.shareDescription === null) {
    return localizedDescription(publication, locale);
  }
  return settings.shareDescription[locale];
}

export function buildMetadata(publication: ActivePublication, locale: Locale): Metadata {
  const siteUrl = getSiteUrl();
  const profile = publication.content.profile;
  const canonicalPath = localePath(locale);
  const title = localizedTitle(publication, locale);
  const description = localizedDescription(publication, locale);
  const socialTitle = shareTitle(publication, locale);
  const socialDescription = shareDescription(publication, locale);
  const alternateLocale = locale === 'en' ? 'fr_FR' : 'en_US';

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
      title: socialTitle,
      description: socialDescription,
      images: [
        {
          url: ogImagePath(locale),
          width: 1200,
          height: 630,
          alt: socialTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: socialDescription,
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
