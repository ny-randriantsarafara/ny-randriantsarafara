import { describe, expect, it, vi } from 'vitest';

import { createAnalyticsDatabaseDouble } from '../test-support/knex-double.ts';
import { AnalyticsDataService } from './analytics-data-service.ts';
import {
  computeRollupDayRange,
  readAnalyticsJobConfig,
  recordJobStatus,
  runAnalyticsJobs,
  shouldPurgeThisRun,
} from './jobs.ts';
import { shouldRunRetention, shouldRunRollup } from './paris-calendar.ts';

describe('analytics scheduled jobs', () => {
  it('labels job status rows from ANALYTICS_ENVIRONMENT', () => {
    expect(readAnalyticsJobConfig({ ANALYTICS_ENVIRONMENT: 'prod' }).analyticsEnvironment).toBe(
      'prod'
    );
  });

  it('catch-up rolls every missing day through yesterday', () => {
    const days = computeRollupDayRange(
      new Date('2026-01-30T04:15:00.000Z'),
      '2026-01-27',
      '2026-01-20'
    );
    expect(days).toEqual(['2026-01-28', '2026-01-29']);
  });

  it('backfills from earliest telemetry when daily_stats is empty', () => {
    const days = computeRollupDayRange(new Date('2026-01-07T04:00:00.000Z'), null, '2026-01-05');
    expect(days).toEqual(['2026-01-05', '2026-01-06']);
  });

  it('requires a successful rollup in the same run before retention at 04:00 Paris', () => {
    const fourAmParis = new Date('2026-01-15T03:15:00.000Z');
    expect(shouldRunRollup(fourAmParis)).toBe(true);
    expect(shouldRunRetention(fourAmParis)).toBe(true);
    expect(shouldPurgeThisRun(fourAmParis, false)).toBe(false);
    expect(shouldPurgeThisRun(fourAmParis, true)).toBe(true);
  });

  it('persists rollup progress details on analytics_status', async () => {
    const captured: { environment: string | null; progress: Record<string, string> | null } = {
      environment: null,
      progress: null,
    };
    const database = createAnalyticsDatabaseDouble((table) => {
      if (table !== 'analytics_status') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        where: () => ({
          first: async () => undefined,
          update: async (payload: { environment: string; progress_details?: string }) => {
            captured.environment = payload.environment;
            if (payload.progress_details !== undefined) {
              captured.progress = parseProgressDetails(payload.progress_details);
            }
          },
        }),
        insert: async (payload: { environment: string; progress_details?: string }) => {
          captured.environment = payload.environment;
          if (payload.progress_details !== undefined) {
            captured.progress = parseProgressDetails(payload.progress_details);
          }
        },
      };
    });

    await recordJobStatus(database, 'rollup', 'success', 'staging', { days: '2026-01-14' });
    expect(captured.environment).toBe('staging');
    expect(captured.progress).toEqual({ days: '2026-01-14' });
  });

  it('skips retention when rollup throws before completion', async () => {
    vi.spyOn(AnalyticsDataService.prototype, 'rollupParisDay').mockRejectedValue(
      new Error('rollup failed')
    );
    const database = createJobDatabase();
    const fourAmParis = new Date('2026-01-15T03:15:00.000Z');
    await expect(
      runAnalyticsJobs(database, fourAmParis, { analyticsEnvironment: 'staging' })
    ).rejects.toThrow('rollup failed');
    expect(database.purgeCalled).toBe(false);
    vi.restoreAllMocks();
  });
});

function parseProgressDetails(raw: string): Record<string, string> {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      record[key] = value;
    }
  }
  return record;
}

function createJobDatabase(): ReturnType<typeof createAnalyticsDatabaseDouble> & {
  purgeCalled: boolean;
  lastEnvironment: string | null;
  lastProgressDetails: Record<string, string> | null;
} {
  const state: {
    purgeCalled: boolean;
    lastEnvironment: string | null;
    lastProgressDetails: Record<string, string> | null;
  } = {
    purgeCalled: false,
    lastEnvironment: null,
    lastProgressDetails: null,
  };
  const database = createAnalyticsDatabaseDouble((table) => {
    if (table === 'events' || table === 'chat_exchanges' || table === 'model_generations') {
      return {
        min: () => ({ first: async () => ({ min_received: '2026-01-14T10:00:00.000Z' }) }),
        where: () => ({
          del: async () => {
            state.purgeCalled = true;
          },
        }),
      };
    }
    if (table === 'chat_reviews') {
      return {
        where: () => ({
          del: async () => {
            state.purgeCalled = true;
          },
        }),
      };
    }
    if (table === 'analytics_status') {
      return {
        where: () => ({
          first: async () => undefined,
          update: async (payload: { environment: string; progress_details?: string }) => {
            state.lastEnvironment = payload.environment;
            if (payload.progress_details !== undefined) {
              state.lastProgressDetails = parseProgressDetails(payload.progress_details);
            }
          },
        }),
        insert: async (payload: { environment: string; progress_details?: string }) => {
          state.lastEnvironment = payload.environment;
          if (payload.progress_details !== undefined) {
            state.lastProgressDetails = parseProgressDetails(payload.progress_details);
          }
        },
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  database.raw = async (sql: string) => {
    if (sql.includes('pg_try_advisory_lock')) {
      return { rows: [{ locked: true }] };
    }
    if (sql.includes('pg_advisory_unlock')) {
      return { rows: [] };
    }
    if (sql.includes('FROM daily_stats')) {
      return { rows: [{ max_day: '2026-01-14' }] };
    }
    if (sql.includes('directus_revisions')) {
      return { rows: [] };
    }
    throw new Error(`Unexpected raw SQL ${sql}`);
  };

  return Object.assign(database, state);
}
