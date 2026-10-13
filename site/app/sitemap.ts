import { readPublication } from '@/lib/publication/read-publication.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publication = readPublication();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');

  return [
    {
      url: baseUrl,
      lastModified: publication.activatedAt,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
