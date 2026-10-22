import { describe, expect, it } from 'vitest';

import { readAnalyticsEnvironment } from './analytics-environment.ts';

describe('readAnalyticsEnvironment', () => {
  it('defaults to local when unset', () => {
    expect(readAnalyticsEnvironment({})).toBe('local');
  });

  it('reads staging and prod labels from deployment configuration', () => {
    expect(readAnalyticsEnvironment({ ANALYTICS_ENVIRONMENT: 'staging' })).toBe('staging');
    expect(readAnalyticsEnvironment({ ANALYTICS_ENVIRONMENT: 'prod' })).toBe('prod');
  });

  it('rejects unknown labels', () => {
    expect(() => readAnalyticsEnvironment({ ANALYTICS_ENVIRONMENT: 'visitor' })).toThrow(
      'ANALYTICS_ENVIRONMENT must be local, staging or prod.'
    );
  });
});
