import { describe, expect, it } from 'vitest';

import { isAuthorizedHookCall } from './hook-authorization.ts';

const secret = 'hook-secret-value';

describe('isAuthorizedHookCall', () => {
  it('accepts the correct bearer secret', () => {
    expect(isAuthorizedHookCall(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('rejects a wrong secret', () => {
    expect(isAuthorizedHookCall('Bearer wrong-secret', secret)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isAuthorizedHookCall(undefined, secret)).toBe(false);
  });

  it('rejects another authorization scheme', () => {
    expect(isAuthorizedHookCall(`Basic ${secret}`, secret)).toBe(false);
  });

  it('rejects an empty bearer token', () => {
    expect(isAuthorizedHookCall('Bearer ', secret)).toBe(false);
  });
});
