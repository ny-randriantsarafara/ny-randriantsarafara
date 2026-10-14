import { describe, expect, it } from 'vitest';

import { isBotUserAgent } from './bot-user-agent.ts';

describe('isBotUserAgent', () => {
  it('detects crawlers and headless clients', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUserAgent('HeadlessChrome/120.0.0.0')).toBe(true);
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true);
  });

  it('allows normal browsers', () => {
    expect(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
  });
});
