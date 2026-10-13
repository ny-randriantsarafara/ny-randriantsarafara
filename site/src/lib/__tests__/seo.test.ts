import { describe, expect, it } from 'vitest';

import { getSiteUrl, parseTitleParts } from '@/lib/seo';

describe('seo helpers', () => {
  it('parses title parts from metadata title', () => {
    const result = parseTitleParts(
      'Ny Hasinavalona Randriantsarafara \u2014 Senior Backend & Cloud Engineer | Software Architect'
    );
    expect(result.name).toBe('Ny Hasinavalona Randriantsarafara');
    expect(result.role).toBe('Senior Backend & Cloud Engineer | Software Architect');
  });

  it('uses the configured public site url when provided', () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

    const url = getSiteUrl();
    expect(url.toString()).toBe('https://example.com/');

    process.env.NEXT_PUBLIC_SITE_URL = original;
  });
});
