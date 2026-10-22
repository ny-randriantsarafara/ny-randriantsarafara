import type { Accountability } from '@directus/types';

export type AnalyticsRoleIds = {
  ownerRoleId: string;
  assistantRoleId: string;
  apiServiceRoleId: string;
};

export type AnalyticsAccess = 'owner' | 'assistant' | 'denied';

export function readAnalyticsRoleIds(env: Record<string, unknown>): AnalyticsRoleIds {
  return {
    ownerRoleId: readRequiredString(env, 'OWNER_ROLE_ID'),
    assistantRoleId: readRequiredString(env, 'AI_ROLE_ID'),
    apiServiceRoleId: readRequiredString(env, 'API_ROLE_ID'),
  };
}

export function resolveAnalyticsAccess(
  accountability: Accountability | null,
  roles: AnalyticsRoleIds
): AnalyticsAccess {
  if (accountability === null) {
    return 'denied';
  }
  if (accountability.admin === true) {
    return 'owner';
  }
  const activeRole = accountability.role;
  if (activeRole === roles.apiServiceRoleId) {
    return 'denied';
  }
  if (activeRole === roles.ownerRoleId) {
    return 'owner';
  }
  if (activeRole === roles.assistantRoleId) {
    return 'assistant';
  }
  return 'denied';
}

function readRequiredString(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`The environment variable ${key} is required for portfolio analytics.`);
  }
  return value.trim();
}
