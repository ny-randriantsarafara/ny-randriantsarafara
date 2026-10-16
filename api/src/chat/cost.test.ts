import { describe, expect, it } from 'vitest';

import type { ModelSettings } from '../model-settings/model-settings.ts';
import { computeModelCostEur, estimateReservationEur } from './cost.ts';

const settings: ModelSettings = {
  modelName: 'test-model',
  inputPriceEurPerMillion: 1,
  cacheReadPriceEurPerMillion: 0.1,
  cacheWritePriceEurPerMillion: 1.25,
  outputPriceEurPerMillion: 5,
  reasoningEffort: null,
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

describe('estimateReservationEur', () => {
  it('bounds the input at one token per byte, at the dearer of input and cache write prices', () => {
    expect(estimateReservationEur({ ...settings, maxOutputTokens: 0 }, 10_000)).toBe(0.0125);
  });

  it('bounds the output at the configured cap', () => {
    expect(estimateReservationEur({ ...settings, maxOutputTokens: 400 }, 0)).toBe(0.002);
  });

  it('assumes an output bound when the CMS sets none, without capping the provider', () => {
    expect(estimateReservationEur({ ...settings, maxOutputTokens: null }, 0)).toBe(0.01);
  });

  it('rounds up to the micro-euro', () => {
    expect(estimateReservationEur({ ...settings, maxOutputTokens: 0 }, 1)).toBe(0.000002);
  });
});
