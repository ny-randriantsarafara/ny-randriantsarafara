import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from '../content-security-policy.ts';

describe('buildContentSecurityPolicy', () => {
  it('includes the API origin in connect-src', () => {
    const policy = buildContentSecurityPolicy('https://api.nyhasinavalona.com/content/active');
    expect(policy).toContain("connect-src 'self' https://api.nyhasinavalona.com");
    expect(policy).toContain("object-src 'none'");
  });
});
