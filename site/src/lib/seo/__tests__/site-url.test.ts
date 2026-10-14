import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSiteUrl } from '../site-url.ts';

describe('getSiteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the production site', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(getSiteUrl().toString()).toBe('https://nyhasinavalona.com/');
  });

  it('uses the URL of the environment being built', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://portfolio-staging.apps.nyhasinavalona.com');
    expect(getSiteUrl().toString()).toBe('https://portfolio-staging.apps.nyhasinavalona.com/');
  });

  it('adds https to a bare host name', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'portfolio-staging.apps.nyhasinavalona.com');
    expect(getSiteUrl().origin).toBe('https://portfolio-staging.apps.nyhasinavalona.com');
  });
});
