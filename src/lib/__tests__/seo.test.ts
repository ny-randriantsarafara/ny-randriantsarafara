import { describe, expect, it } from 'vitest';

import { getSiteUrl, parseTitleParts } from '@/lib/seo';

describe('seo helpers', () => {
  it('parses title parts from metadata title', () => {
    const result = parseTitleParts('Ny Hasinavalona \u2014 Senior Software Engineer');
    expect(result.name).toBe('Ny Hasinavalona');
    expect(result.role).toBe('Senior Software Engineer');
  });

  it('uses the configured public site url when provided', () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

    const url = getSiteUrl();
    expect(url.toString()).toBe('https://example.com/');

    process.env.NEXT_PUBLIC_SITE_URL = original;
  });
});
