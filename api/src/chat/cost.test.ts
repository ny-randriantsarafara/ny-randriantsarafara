import { describe, expect, it } from 'vitest';

import type { ModelSettings } from '../model-settings/model-settings.ts';
import { computeModelCostEur } from './cost.ts';

const settings: ModelSettings = {
  modelName: 'test-model',
  inputPriceEurPerMillion: 1,
  cacheReadPriceEurPerMillion: 0.1,
  cacheWritePriceEurPerMillion: 1.25,
  outputPriceEurPerMillion: 5,
  timeoutMilliseconds: 10_000,
};

describe('computeModelCostEur', () => {
  it('bills input and output tokens at their prices', () => {
    expect(
      computeModelCostEur(settings, {
        inputTokens: 1_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 100,
      })
    ).toBe(0.0015);
  });

  it('bills the input read from or written to the prompt cache at the cache prices', () => {
    expect(
      computeModelCostEur(settings, {
        inputTokens: 15_000,
        cacheReadTokens: 10_000,
        cacheWriteTokens: 4_000,
        outputTokens: 0,
      })
    ).toBe(0.007);
  });

  it('never bills a negative uncached input', () => {
    expect(
      computeModelCostEur(settings, {
        inputTokens: 100,
        cacheReadTokens: 1_000,
        cacheWriteTokens: 0,
        outputTokens: 0,
      })
    ).toBe(0.0001);
  });
});
