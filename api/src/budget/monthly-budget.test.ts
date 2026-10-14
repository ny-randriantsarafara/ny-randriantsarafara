import { describe, expect, it, vi } from 'vitest';

import { createMonthlyBudgetGate } from './monthly-budget.ts';

describe('createMonthlyBudgetGate', () => {
  it('caches the sum for sixty seconds', async () => {
    const source = { sumMonthToDateCostEur: vi.fn(async () => 1.5) };
    const clock = { now: 0 };
    const gate = createMonthlyBudgetGate({
      source,
      budgetEur: 5,
      monthStartIso: () => '2026-10-01T00:00:00.000Z',
      clock: () => new Date(clock.now),
      cacheTtlMilliseconds: 60_000,
      log: () => undefined,
    });

    expect(await gate.readStatus()).toBe('within_budget');
    clock.now = 30_000;
    expect(await gate.readStatus()).toBe('within_budget');
    expect(source.sumMonthToDateCostEur).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the source errors', async () => {
    const gate = createMonthlyBudgetGate({
      source: { sumMonthToDateCostEur: async () => Promise.reject(new Error('down')) },
      budgetEur: 5,
      monthStartIso: () => '2026-10-01T00:00:00.000Z',
      clock: () => new Date(0),
      cacheTtlMilliseconds: 60_000,
      log: () => undefined,
    });

    expect(await gate.readStatus()).toBe('unavailable');
  });

  it('reports exhausted at one hundred percent of the budget', async () => {
    const gate = createMonthlyBudgetGate({
      source: { sumMonthToDateCostEur: async () => 5 },
      budgetEur: 5,
      monthStartIso: () => '2026-10-01T00:00:00.000Z',
      clock: () => new Date(0),
      cacheTtlMilliseconds: 60_000,
      log: () => undefined,
    });

    expect(await gate.readStatus()).toBe('exhausted');
  });
});
