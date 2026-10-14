import { listRecentParisDayKeys } from '../time/paris-calendar.ts';
import type { DailyStatsSource } from './directus-daily-stats-source.ts';

const RECOMPUTE_DAYS = 10;

export type DailyStatsJob = {
  run(): Promise<void>;
};

export type DailyStatsJobDependencies = {
  source: DailyStatsSource;
  clock: () => Date;
  log: (message: string) => void;
};

export function createDailyStatsJob(dependencies: DailyStatsJobDependencies): DailyStatsJob {
  return {
    run: () => runDailyStats(dependencies),
  };
}

async function runDailyStats(dependencies: DailyStatsJobDependencies): Promise<void> {
  const days = listRecentParisDayKeys(dependencies.clock, RECOMPUTE_DAYS);
  for (const day of days) {
    const snapshot = await dependencies.source.computeDay(day);
    await dependencies.source.upsertDay(snapshot);
  }
  dependencies.log(`Daily stats recomputed for ${days.length} Paris days.`);
}
