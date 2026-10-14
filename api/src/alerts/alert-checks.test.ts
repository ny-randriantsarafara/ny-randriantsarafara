import { describe, expect, it, vi } from 'vitest';

import { createAlertChecks } from './alert-checks.ts';

describe('createAlertChecks', () => {
  it('skips budget and model checks when model mode is disabled', async () => {
    const raiseAlert = vi.fn(async () => undefined);
    await createAlertChecks({
      modelConfiguration: null,
      budgetSource: { sumMonthToDateCostEur: vi.fn(async () => 0) },
      modelFailureSource: { countRecentFailures: vi.fn(async () => 0) },
      raiseAlert,
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    }).run();
    expect(raiseAlert).not.toHaveBeenCalled();
  });

  it('raises budget thresholds once per Paris month key', async () => {
    const raiseAlert = vi.fn(async () => undefined);
    await createAlertChecks({
      modelConfiguration: {
        baseUrl: 'https://example.com',
        apiKey: 'key',
        modelName: 'model',
        inputPriceEurPerMillion: 1,
        outputPriceEurPerMillion: 1,
        monthlyBudgetEur: 10,
        dailyCallLimit: 100,
      },
      budgetSource: { sumMonthToDateCostEur: vi.fn(async () => 9) },
      modelFailureSource: { countRecentFailures: vi.fn(async () => 0) },
      raiseAlert,
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    }).run();
    expect(raiseAlert).toHaveBeenCalledTimes(1);
    expect(raiseAlert.mock.calls[0]?.[0]?.dedupKey).toBe('budget:80:2026-10');
  });

  it('raises an hourly model failure alert when five failures occur in fifteen minutes', async () => {
    const raiseAlert = vi.fn(async () => undefined);
    await createAlertChecks({
      modelConfiguration: {
        baseUrl: 'https://example.com',
        apiKey: 'key',
        modelName: 'model',
        inputPriceEurPerMillion: 1,
        outputPriceEurPerMillion: 1,
        monthlyBudgetEur: 10,
        dailyCallLimit: 100,
      },
      budgetSource: { sumMonthToDateCostEur: vi.fn(async () => 0) },
      modelFailureSource: { countRecentFailures: vi.fn(async () => 5) },
      raiseAlert,
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    }).run();
    expect(raiseAlert).toHaveBeenCalledOnce();
    expect(raiseAlert.mock.calls[0]?.[0]?.dedupKey).toMatch(/^model-failures:2026-10-14T/);
  });
});
