import { ForbiddenError } from '@directus/errors';
import type { Accountability } from '@directus/types';

import { type AnalyticsRoleIds, resolveAnalyticsAccess } from './roles.ts';

export function assertReadAccess(
  accountability: Accountability | null,
  roles: AnalyticsRoleIds
): void {
  const access = resolveAnalyticsAccess(accountability ?? null, roles);
  if (access === 'denied') {
    throw new ForbiddenError();
  }
}

export function assertOwnerAccess(
  accountability: Accountability | null,
  roles: AnalyticsRoleIds
): void {
  const access = resolveAnalyticsAccess(accountability ?? null, roles);
  if (access !== 'owner') {
    throw new ForbiddenError();
  }
}
