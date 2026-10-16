import { describe, expect, it, vi } from 'vitest';

import { createMonthlyBudgetGate, type MonthlyBudgetGateDependencies } from './monthly-budget.ts';

function gateWith(overrides: Partial<MonthlyBudgetGateDependencies> = {}) {
  return createMonthlyBudgetGate({
    source: { sumMonthToDateCostEur: async () => 0 },
    budgetEur: 1,
    monthStartIso: () => '2026-10-01T00:00:00.000Z',
    clock: () => new Date(0),
    cacheTtlMilliseconds: 60_000,
    log: () => undefined,
    ...overrides,
  });
}

async function reserved(gate: ReturnType<typeof gateWith>, estimateEur: number) {
  const result = await gate.reserve(estimateEur);
  if (result.status !== 'reserved') throw new Error(`Expected a reservation, got ${result.status}`);
  return result.reservation;
}

describe('createMonthlyBudgetGate', () => {
  it('caches the sum for sixty seconds', async () => {
    const source = { sumMonthToDateCostEur: vi.fn(async () => 0.5) };
    const clock = { now: 0 };
    const gate = gateWith({ source, clock: () => new Date(clock.now) });

    expect((await gate.reserve(0.01)).status).toBe('reserved');
    clock.now = 30_000;
    expect((await gate.reserve(0.01)).status).toBe('reserved');
    expect(source.sumMonthToDateCostEur).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the source errors', async () => {
    const log = vi.fn();
    const gate = gateWith({
      source: { sumMonthToDateCostEur: async () => Promise.reject(new Error('down')) },
      log,
    });

    expect(await gate.reserve(0.01)).toEqual({ status: 'unavailable' });
    expect(log).toHaveBeenCalledOnce();
  });

  it('refuses a generation that would take the month past the budget', async () => {
    const gate = gateWith({ source: { sumMonthToDateCostEur: async () => 0.95 } });

    expect((await gate.reserve(0.06)).status).toBe('exhausted');
    expect((await gate.reserve(0.05)).status).toBe('reserved');
  });

  it('lets only the concurrent generations that fit reserve the remaining budget', async () => {
    const gate = gateWith({ source: { sumMonthToDateCostEur: async () => 0.7 } });

    const results = await Promise.all([0.1, 0.1, 0.1, 0.1].map((cost) => gate.reserve(cost)));

    expect(results.map((result) => result.status)).toEqual([
      'reserved',
      'reserved',
      'reserved',
      'exhausted',
    ]);
  });

  it('counts the billed cost instead of the estimate once settled', async () => {
    const gate = gateWith({ source: { sumMonthToDateCostEur: async () => 0.5 } });

    (await reserved(gate, 0.4)).settle(0.1);

    expect((await gate.reserve(0.4)).status).toBe('reserved');
    expect((await gate.reserve(0.01)).status).toBe('exhausted');
  });

  it('keeps the estimate of a generation whose cost the provider never reported', async () => {
    const gate = gateWith({ source: { sumMonthToDateCostEur: async () => 0.5 } });

    (await reserved(gate, 0.4)).settle(null);

    expect((await gate.reserve(0.2)).status).toBe('exhausted');
  });

  it('frees the reservation of a request that never reached the provider', async () => {
    const gate = gateWith({ source: { sumMonthToDateCostEur: async () => 0.5 } });
    const reservation = await reserved(gate, 0.4);

    reservation.cancel();
    reservation.settle(0.4);

    expect((await gate.reserve(0.5)).status).toBe('reserved');
  });

  it('stops counting a settled cost once the recorded sum includes it', async () => {
    const recorded = { sumEur: 0.5 };
    const clock = { now: 0 };
    const gate = gateWith({
      source: { sumMonthToDateCostEur: async () => recorded.sumEur },
      clock: () => new Date(clock.now),
    });
    (await reserved(gate, 0.3)).settle(0.3);
    recorded.sumEur = 0.8;
    clock.now = 60_000;

    expect((await gate.reserve(0.2)).status).toBe('reserved');
    expect((await gate.reserve(0.01)).status).toBe('exhausted');
  });

  it('starts the new month without the previous month settled costs', async () => {
    const month = { start: '2026-10-01T00:00:00.000Z' };
    const gate = gateWith({ monthStartIso: () => month.start });
    (await reserved(gate, 0.9)).settle(0.9);
    expect((await gate.reserve(0.2)).status).toBe('exhausted');

    month.start = '2026-11-01T00:00:00.000Z';

    expect((await gate.reserve(0.9)).status).toBe('reserved');
  });
});
