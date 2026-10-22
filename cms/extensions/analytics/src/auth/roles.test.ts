import { describe, expect, it } from 'vitest';

import { resolveAnalyticsAccess } from './roles.ts';

const roles = {
  ownerRoleId: 'owner-role',
  assistantRoleId: 'assistant-role',
  apiServiceRoleId: 'api-role',
};

describe('resolveAnalyticsAccess', () => {
  it('denies anonymous and API service callers', () => {
    expect(resolveAnalyticsAccess(null, roles)).toBe('denied');
    expect(
      resolveAnalyticsAccess(
        { role: 'api-role', roles: [], user: 'u1', admin: false, app: false, ip: null },
        roles
      )
    ).toBe('denied');
  });

  it('allows owner and assistant roles', () => {
    expect(
      resolveAnalyticsAccess(
        { role: 'owner-role', roles: [], user: 'u1', admin: false, app: true, ip: null },
        roles
      )
    ).toBe('owner');
    expect(
      resolveAnalyticsAccess(
        { role: 'assistant-role', roles: [], user: 'u2', admin: false, app: true, ip: null },
        roles
      )
    ).toBe('assistant');
  });
});
