import { localePath, locales } from '@/lib/i18n/locales.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publication = readPublication();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');
  const lastModified = new Date(publication.activatedAt);

  return locales.map((locale) => ({
    url: `${baseUrl}${localePath(locale)}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: locale === 'en' ? 1 : 0.9,
    alternates: {
      languages: {
        en: `${baseUrl}/`,
        fr: `${baseUrl}/fr`,
        'x-default': `${baseUrl}/`,
      },
    },
  }));
}
