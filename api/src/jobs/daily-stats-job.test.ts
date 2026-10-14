import { describe, expect, it, vi } from 'vitest';

import { createDailyStatsJob } from './daily-stats-job.ts';
import type { DailyStatsSnapshot } from './daily-stats-types.ts';

describe('createDailyStatsJob', () => {
  it('recomputes and upserts the last ten Paris days', async () => {
    const computeDay = vi.fn(
      async (day: string): Promise<DailyStatsSnapshot> => ({
        day,
        visitors: 1,
        pageViews: 2,
        conversations: 1,
        modelExchanges: 0,
        scriptedExchanges: 1,
        outcomeAnswered: 1,
        outcomeUnknown: 0,
        outcomeSensitive: 0,
        outcomeRefused: 0,
        contactMessages: 0,
        cvDownloads: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        averagePosition: 0,
        modelCostEur: 0,
      })
    );
    const upsertDay = vi.fn(async () => undefined);
    await createDailyStatsJob({
      source: { computeDay, upsertDay },
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
      log: vi.fn(),
    }).run();
    expect(computeDay).toHaveBeenCalledTimes(10);
    expect(upsertDay).toHaveBeenCalledTimes(10);
  });
});
