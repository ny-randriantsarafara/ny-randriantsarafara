import type { AnalyticsDatabase } from './analytics-database.ts';
import type { AnalyticsEnvironment } from '@portfolio/cms-schema';

import { readAnalyticsEnvironment } from '../env/analytics-environment.ts';
import { AnalyticsDataService } from './analytics-data-service.ts';
import {
  addParisDays,
  formatParisDate,
  listInclusiveParisDays,
  parisDayBounds,
  shouldRunRetention,
  shouldRunRollup,
  subtractParisCalendarMonths,
} from './paris-calendar.ts';

const ADVISORY_LOCK_KEY = 0x706f7274;

const telemetryCollections = [
  'events',
  'chat_exchanges',
  'model_generations',
  'chat_reviews',
] as const;

const telemetryReceivedAtCollections = ['events', 'chat_exchanges', 'model_generations'] as const;

export type JobRunResult = {
  rolledUpDays: string[];
  purgedBefore: string | null;
};

export type AnalyticsJobConfig = {
  analyticsEnvironment: AnalyticsEnvironment;
};

export function readAnalyticsJobConfig(env: Record<string, unknown>): AnalyticsJobConfig {
  return {
    analyticsEnvironment: readAnalyticsEnvironment(env),
  };
}

export async function runAnalyticsJobs(
  database: AnalyticsDatabase,
  reference: Date,
  config: AnalyticsJobConfig
): Promise<JobRunResult> {
  const locked = await tryAdvisoryLock(database);
  if (!locked) {
    return { rolledUpDays: [], purgedBefore: null };
  }

  try {
    const rolledUpDays: string[] = [];
    let rollupCompletedThisRun = false;

    if (shouldRunRollup(reference)) {
      const days = await resolveRollupDays(database, reference);
      const service = new AnalyticsDataService(database);
      for (const day of days) {
        await service.rollupParisDay(day, config.analyticsEnvironment);
        rolledUpDays.push(day);
      }
      rollupCompletedThisRun = true;
      await recordJobStatus(database, 'rollup', 'success', config.analyticsEnvironment, {
        days: rolledUpDays.join(','),
      });
    }

    let purgedBefore: string | null = null;
    if (shouldRunRetention(reference) && rollupCompletedThisRun) {
      purgedBefore = await purgeExpiredTelemetry(database, reference);
      await recordJobStatus(database, 'retention', 'success', config.analyticsEnvironment, {
        purgedBefore,
      });
    }

    return { rolledUpDays, purgedBefore };
  } catch (error) {
    await recordJobStatus(database, 'rollup', 'failure', config.analyticsEnvironment, {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await database.raw('SELECT pg_advisory_unlock(?)', [ADVISORY_LOCK_KEY]);
  }
}

export function shouldPurgeThisRun(reference: Date, rollupCompletedThisRun: boolean): boolean {
  return shouldRunRetention(reference) && rollupCompletedThisRun;
}

export async function purgeExpiredTelemetry(
  database: AnalyticsDatabase,
  reference: Date
): Promise<string> {
  const todayParis = formatParisDate(reference);
  const purgedBefore = subtractParisCalendarMonths(todayParis, 13);
  const cutoffBounds = parisDayBounds(purgedBefore).startUtc;
  await database('chat_reviews')
    .where((builder) => {
      builder
        .whereIn(
          'exchange_id',
          database('chat_exchanges').select('id').whereRaw('received_at < ?', [cutoffBounds])
        )
        .orWhere('date_created', '<', cutoffBounds);
    })
    .del();
  for (const collection of telemetryReceivedAtCollections) {
    await database(collection).whereRaw('received_at < ?', [cutoffBounds]).del();
  }
  await database.raw(
    `
      DELETE FROM directus_revisions AS revision
      USING directus_activity AS activity
      WHERE revision.activity = activity.id
        AND revision.collection = ANY(?)
        AND activity.timestamp < ?
    `,
    [[...telemetryCollections], cutoffBounds]
  );
  return purgedBefore;
}

export function computeRollupDayRange(
  reference: Date,
  maxDay: string | null,
  earliestDay: string | null
): string[] {
  const todayParis = formatParisDate(reference);
  const yesterday = addParisDays(todayParis, -1);
  const startDay = resolveRollupStartDay(maxDay, earliestDay, yesterday);
  return listInclusiveParisDays(startDay, yesterday);
}

export async function resolveRollupDays(
  database: AnalyticsDatabase,
  reference: Date
): Promise<string[]> {
  const maxRow = await database('daily_stats').max('day as max_day').first();
  const maxDay = readNullableDay(readStringField(maxRow, 'max_day'));
  const earliestDay = await earliestTelemetryParisDay(database);
  return computeRollupDayRange(reference, maxDay, earliestDay);
}

function resolveRollupStartDay(
  maxDay: string | null,
  earliestDay: string | null,
  yesterday: string
): string {
  if (maxDay !== null) {
    const nextDay = addParisDays(maxDay, 1);
    if (nextDay <= yesterday) {
      return nextDay;
    }
    return yesterday;
  }

  if (earliestDay === null) {
    return yesterday;
  }
  if (earliestDay > yesterday) {
    return yesterday;
  }
  return earliestDay;
}

function readStringField(row: Record<string, unknown> | undefined, field: string): string | null {
  if (row === undefined) {
    return null;
  }
  const value = row[field];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

function readNullableDay(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value;
}

async function earliestTelemetryParisDay(database: AnalyticsDatabase): Promise<string | null> {
  const candidates: string[] = [];
  const tables = ['events', 'chat_exchanges', 'model_generations'] as const;
  for (const table of tables) {
    const row = await database(table).min('received_at as min_received').first();
    const minReceived = readStringField(row, 'min_received');
    if (minReceived !== null && minReceived !== undefined && minReceived !== '') {
      candidates.push(formatParisDate(new Date(minReceived)));
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort()[0] ?? null;
}

async function tryAdvisoryLock(database: AnalyticsDatabase): Promise<boolean> {
  const result = await database.raw('SELECT pg_try_advisory_lock(?) AS locked', [
    ADVISORY_LOCK_KEY,
  ]);
  const rows = readLockRows(result);
  const row = rows[0];
  if (row === undefined) {
    return false;
  }
  return row.locked === true;
}

function readLockRows(result: unknown): { locked: boolean }[] {
  if (result === null || typeof result !== 'object') {
    return [];
  }
  if (!('rows' in result)) {
    return [];
  }
  const rawRows = result.rows;
  if (!Array.isArray(rawRows)) {
    return [];
  }
  const rows: { locked: boolean }[] = [];
  for (const entry of rawRows) {
    if (entry === null || typeof entry !== 'object') {
      continue;
    }
    if (!('locked' in entry)) {
      continue;
    }
    const locked = entry.locked;
    if (typeof locked === 'boolean') {
      rows.push({ locked });
    }
  }
  return rows;
}

export async function recordJobStatus(
  database: AnalyticsDatabase,
  component: string,
  outcome: 'success' | 'failure',
  analyticsEnvironment: AnalyticsEnvironment,
  details: Record<string, string>
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await database('analytics_status').where({ component }).first();
  const payload = {
    component,
    environment: analyticsEnvironment,
    last_refresh_at: now,
    last_success_at: outcome === 'success' ? now : (existing?.last_success_at ?? null),
    last_failure_at: outcome === 'failure' ? now : (existing?.last_failure_at ?? null),
    pending: 0,
    succeeded:
      outcome === 'success'
        ? Number(existing?.succeeded ?? 0) + 1
        : Number(existing?.succeeded ?? 0),
    failed:
      outcome === 'failure' ? Number(existing?.failed ?? 0) + 1 : Number(existing?.failed ?? 0),
    dropped: Number(existing?.dropped ?? 0),
    retries: Number(existing?.retries ?? 0),
    analytics_version: 1,
    progress_details: JSON.stringify(details),
  };

  if (existing === undefined) {
    await database('analytics_status').insert({ id: crypto.randomUUID(), ...payload });
    return;
  }

  await database('analytics_status').where({ id: existing.id }).update(payload);
}
