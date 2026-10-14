import { parisDayKey } from '../time/paris-calendar.ts';
import type { RetentionStore } from './directus-retention-store.ts';
import { retentionEventsCutoffIso } from './retention-cutoff.ts';

export type RetentionJob = {
  run(): Promise<void>;
};

export type RetentionJobDependencies = {
  store: RetentionStore;
  clock: () => Date;
  log: (message: string) => void;
};

export function createRetentionJob(dependencies: RetentionJobDependencies): RetentionJob {
  return {
    run: () => runRetention(dependencies),
  };
}

async function runRetention(dependencies: RetentionJobDependencies): Promise<void> {
  const cutoffIso = retentionEventsCutoffIso(dependencies.clock);
  const eventsDeleted = await dependencies.store.deleteExpiredEvents(cutoffIso);
  const exchangesDeleted = await dependencies.store.deleteExpiredChatExchanges(cutoffIso);
  const saltsDeleted = await dependencies.store.deletePreviousVisitorSalts(
    parisDayKey(dependencies.clock)
  );
  dependencies.log(
    `Retention deleted ${eventsDeleted} events, ${exchangesDeleted} chat exchanges and ${saltsDeleted} visitor salts.`
  );
}
