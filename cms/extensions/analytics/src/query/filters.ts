import type { AnalyticsEnvironment } from '@portfolio/cms-schema';

import { isAnalyticsEnvironment } from '../env/analytics-environment.ts';

export type AnalyticsFilterKey =
  | 'locale'
  | 'environment'
  | 'device_class'
  | 'utm_source'
  | 'model'
  | 'provider_id'
  | 'publication_id';

export type AnalyticsFilters = Partial<Record<AnalyticsFilterKey, string>>;

export const analyticsPaginationQueryKeys = ['page', 'limit'] as const;

const allowedKeys: AnalyticsFilterKey[] = [
  'locale',
  'environment',
  'device_class',
  'utm_source',
  'model',
  'provider_id',
  'publication_id',
];

export class AnalyticsFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsFilterError';
  }
}

/** Drops pagination and other non-filter query keys before allowlist validation. */
export function pickAnalyticsFilterQuery(
  source: Record<string, string | undefined>
): Record<string, string | undefined> {
  const picked: Record<string, string | undefined> = {};
  for (const key of allowedKeys) {
    const value = source[key];
    if (value !== undefined) {
      picked[key] = value;
    }
  }
  return picked;
}

export function parseAnalyticsFilters(
  source: Record<string, string | undefined>
): AnalyticsFilters {
  rejectUnknownFilterKeys(source);
  const filters: AnalyticsFilters = {};
  for (const key of allowedKeys) {
    const value = source[key];
    if (value === undefined || value.trim() === '') {
      continue;
    }
    if (key === 'environment' && !isAnalyticsEnvironment(value.trim())) {
      throw new AnalyticsFilterError(`Unsupported environment filter "${value.trim()}".`);
    }
    filters[key] = value.trim();
  }
  return filters;
}

export function rejectUnknownFilterKeys(source: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value.trim() === '') {
      continue;
    }
    if (isPaginationQueryKey(key)) {
      continue;
    }
    if (!isAllowedFilterKey(key)) {
      throw new AnalyticsFilterError(`Unsupported analytics filter "${key}".`);
    }
  }
}

function isPaginationQueryKey(key: string): boolean {
  for (const allowed of analyticsPaginationQueryKeys) {
    if (allowed === key) {
      return true;
    }
  }
  return false;
}

function isAllowedFilterKey(key: string): key is AnalyticsFilterKey {
  for (const allowed of allowedKeys) {
    if (allowed === key) {
      return true;
    }
  }
  return false;
}

export function filterClause(
  filters: AnalyticsFilters,
  columnByKey: Partial<Record<AnalyticsFilterKey, string>>
): { sql: string; bindings: string[] } {
  const parts: string[] = [];
  const bindings: string[] = [];

  for (const key of allowedKeys) {
    const value = filters[key];
    if (value === undefined) {
      continue;
    }
    const column = columnByKey[key];
    if (column === undefined) {
      continue;
    }
    parts.push(`${column} = ?`);
    bindings.push(value);
  }

  if (parts.length === 0) {
    return { sql: 'TRUE', bindings: [] };
  }

  return { sql: parts.join(' AND '), bindings };
}
