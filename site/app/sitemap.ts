import { getContentLastModified, getSiteUrl } from '@/lib/seo';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = await getContentLastModified();
  const baseUrl = siteUrl.toString().replace(/\/$/, '');

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
