import { ForbiddenError } from '@directus/errors';
import type { Accountability } from '@directus/types';
import { describe, expect, it } from 'vitest';

import { assertOwnerAccess, assertReadAccess } from './access-guards.ts';
import type { AnalyticsRoleIds } from './roles.ts';

const roles: AnalyticsRoleIds = {
  ownerRoleId: 'owner-role',
  assistantRoleId: 'assistant-role',
  apiServiceRoleId: 'api-role',
};

function accountability(partial: Partial<Accountability>): Accountability {
  return {
    user: 'user-1',
    role: null,
    roles: [],
    admin: false,
    app: true,
    ip: '127.0.0.1',
    userAgent: 'vitest',
    origin: undefined,
    session: undefined,
    ...partial,
  };
}

describe('portfolio analytics access guards', () => {
  it('denies anonymous and API service reads on diagnostic routes', () => {
    expect(() => assertReadAccess(null, roles)).toThrow(ForbiddenError);
    expect(() => assertReadAccess(accountability({ role: roles.apiServiceRoleId }), roles)).toThrow(
      ForbiddenError
    );
  });

  it('allows owner and assistant reads without trusting request parameters', () => {
    expect(() =>
      assertReadAccess(accountability({ role: roles.ownerRoleId }), roles)
    ).not.toThrow();
    expect(() =>
      assertReadAccess(accountability({ role: roles.assistantRoleId }), roles)
    ).not.toThrow();
  });

  it('grants owner review writes only to the owner role', () => {
    expect(() =>
      assertOwnerAccess(accountability({ role: roles.ownerRoleId }), roles)
    ).not.toThrow();
    expect(() => assertOwnerAccess(accountability({ role: roles.assistantRoleId }), roles)).toThrow(
      ForbiddenError
    );
  });
});
