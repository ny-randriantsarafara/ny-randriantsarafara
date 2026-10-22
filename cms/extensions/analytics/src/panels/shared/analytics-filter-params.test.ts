import { describe, expect, it } from 'vitest';

import {
  readAnalyticsFilterParams,
  readInsightsStoreVariables,
} from './analytics-filter-params.ts';

describe('readInsightsStoreVariables', () => {
  it('returns an empty record when the store shape is not recognised', () => {
    expect(readInsightsStoreVariables(null)).toEqual({});
    expect(readInsightsStoreVariables({ variables: 'bad' })).toEqual({});
  });

  it('maps recognised dashboard variables to query params', () => {
    const params = readAnalyticsFilterParams({
      analytics_locale: ' en ',
      analytics_model: 'test-model',
    });
    expect(params).toEqual({ locale: 'en', model: 'test-model' });
  });
});
