import { describe, expect, it } from 'vitest';

import {
  AnalyticsFilterError,
  filterClause,
  parseAnalyticsFilters,
  pickAnalyticsFilterQuery,
  rejectUnknownFilterKeys,
} from './filters.ts';

describe('analytics filter allowlist', () => {
  it('parameterizes allowed filters for SQL', () => {
    const filters = parseAnalyticsFilters({ locale: 'en', model: 'gpt-test' });
    const clause = filterClause(filters, {
      locale: 'events.locale',
      model: 'chat_exchanges.model',
    });
    expect(clause.sql).toBe('events.locale = ? AND chat_exchanges.model = ?');
    expect(clause.bindings).toEqual(['en', 'gpt-test']);
  });

  it('rejects filters outside the allowlist instead of passing them through', () => {
    expect(() => parseAnalyticsFilters({ locale: 'en', role: 'owner' })).toThrow(
      AnalyticsFilterError
    );
    expect(() => parseAnalyticsFilters({ locale: 'en', role: 'owner' })).toThrow(
      'Unsupported analytics filter "role".'
    );
  });

  it('rejects invalid environment values', () => {
    expect(() => parseAnalyticsFilters({ environment: 'visitor' })).toThrow(
      'Unsupported environment filter "visitor".'
    );
  });

  it('strips pagination keys before allowlist validation', () => {
    const picked = pickAnalyticsFilterQuery({ limit: '10', page: '2', locale: 'en' });
    expect(parseAnalyticsFilters(picked)).toEqual({ locale: 'en' });
    expect(() => rejectUnknownFilterKeys({ limit: '10', page: '2', locale: 'en' })).not.toThrow();
    expect(() => rejectUnknownFilterKeys({ limit: '10', role: 'owner' })).toThrow(
      AnalyticsFilterError
    );
  });
});
