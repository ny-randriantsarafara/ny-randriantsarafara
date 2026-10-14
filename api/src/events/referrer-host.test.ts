import { describe, expect, it } from 'vitest';

import { readReferrerHost } from './referrer-host.ts';

describe('readReferrerHost', () => {
  it('extracts the hostname from a referrer URL', () => {
    expect(readReferrerHost('https://www.example.com/path')).toBe('www.example.com');
  });

  it('returns null for missing or invalid referrers', () => {
    expect(readReferrerHost(undefined)).toBeNull();
    expect(readReferrerHost('not-a-url')).toBeNull();
  });
});
