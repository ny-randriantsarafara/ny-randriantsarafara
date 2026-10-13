const defaultSiteUrl = 'https://nyhasinavalona.com';

export function getSiteUrl(): URL {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!envUrl) {
    return new URL(defaultSiteUrl);
  }
  const normalized = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  return new URL(normalized);
}
