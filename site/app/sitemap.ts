import { localePath, locales } from '@/lib/i18n/locales.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { privacyPathsForSitemap } from '@/lib/seo/privacy-metadata.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publication = readPublication();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');
  const lastModified = new Date(publication.activatedAt);

  const monthlyFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'monthly';

  const homeEntries = locales.map((locale) => ({
    url: `${baseUrl}${localePath(locale)}`,
    lastModified,
    changeFrequency: monthlyFrequency,
    priority: locale === 'en' ? 1 : 0.9,
    alternates: {
      languages: {
        'en-US': `${baseUrl}/`,
        fr: `${baseUrl}/fr`,
        'x-default': `${baseUrl}/`,
      },
    },
  }));

  return [...homeEntries, ...privacyPathsForSitemap(baseUrl, lastModified)];
}
