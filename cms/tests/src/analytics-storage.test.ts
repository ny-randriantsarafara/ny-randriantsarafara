import type { Knex } from 'knex';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { requireAnalyticsDatabase } from '../../extensions/analytics/src/query/analytics-database.ts';
import { AnalyticsDataService } from '../../extensions/analytics/src/query/analytics-data-service.ts';
import {
  runAnalyticsJobs,
  type AnalyticsJobConfig,
} from '../../extensions/analytics/src/query/jobs.ts';
import {
  dailyStatsKeyName,
  migrateAnalyticsStorage,
} from '../../provision/src/analytics/migrate-analytics-storage.ts';
import { createIntegrationDatabase } from './support/database.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const ignoreLog = () => undefined;

// 03:45 in Paris on 16 October 2026: rollups run, retention (04:00) does not.
const nextMorning = new Date('2026-10-16T01:45:00.000Z');
const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('analytics storage on a provisioned instance', () => {
  const database = createIntegrationDatabase();

  afterAll(async () => {
    await database.destroy();
  });

  it('keys daily_stats by day and environment, with day as a date', async () => {
    expect(await uniqueKeys(database, 'public')).toEqual([
      { name: dailyStatsKeyName, columns: ['day', 'environment'] },
    ]);
    expect(await dayColumnType(database, 'public')).toBe('date');
  });

  it('upserts one row per day and environment when a day is summarized twice', async () => {
    const day = '2099-03-15';
    const service = new AnalyticsDataService(requireAnalyticsDatabase(database));
    try {
      await service.rollupParisDay(day, 'local');
      await service.rollupParisDay(day, 'local');
      await service.rollupParisDay(day, 'staging');

      const rows = await selectRows(
        database,
        'SELECT environment FROM daily_stats WHERE day = ? ORDER BY environment',
        [day]
      );
      expect(rows).toEqual([{ environment: 'local' }, { environment: 'staging' }]);
    } finally {
      await database('daily_stats').where({ day }).del();
    }
  });
});

describe('analytics storage upgrade from the day-keyed schema', () => {
  const schema = `analytics_upgrade_${uniqueSuffix()}`;
  const admin = createIntegrationDatabase();
  const database = createIntegrationDatabase(schema);

  beforeAll(async () => {
    await admin.raw('CREATE SCHEMA ??', [schema]);
    for (const table of ['daily_stats', 'events', 'chat_exchanges', 'model_generations']) {
      await admin.raw('CREATE TABLE ??.?? (LIKE public.?? INCLUDING DEFAULTS)', [
        schema,
        table,
        table,
      ]);
    }
    await admin.raw('CREATE TABLE ??.analytics_status (LIKE public.analytics_status)', [schema]);
    // The schema staging and production ran before the fix: a text day, unique on its own.
    await database.raw('ALTER TABLE daily_stats ALTER COLUMN day TYPE varchar(255)');
    await database.raw(
      'ALTER TABLE daily_stats ADD CONSTRAINT daily_stats_day_unique UNIQUE (day)'
    );
    await seedLegacyHistory(database);
  });

  afterAll(async () => {
    await database.destroy();
    await admin.raw('DROP SCHEMA ?? CASCADE', [schema]);
    await admin.destroy();
  });

  it('replaces the day-only key and backfills the history once', async () => {
    const first = await migrateAnalyticsStorage(database, 'staging', ignoreLog);

    expect(first).toEqual({
      dayConverted: true,
      keyCreated: true,
      removedDayKeys: ['daily_stats_day_unique'],
      relabelledDays: 1,
      backfills: [
        { table: 'events', receivedAt: 3, environment: 3 },
        { table: 'chat_exchanges', receivedAt: 2, environment: 3 },
        { table: 'model_generations', receivedAt: 0, environment: 0 },
      ],
    });
    expect(await uniqueKeys(database, schema)).toEqual([
      { name: dailyStatsKeyName, columns: ['day', 'environment'] },
    ]);
    expect(await dayColumnType(database, schema)).toBe('date');

    const second = await migrateAnalyticsStorage(database, 'staging', ignoreLog);

    expect(second).toEqual({
      dayConverted: false,
      keyCreated: false,
      removedDayKeys: [],
      relabelledDays: 0,
      backfills: [
        { table: 'events', receivedAt: 0, environment: 0 },
        { table: 'chat_exchanges', receivedAt: 0, environment: 0 },
        { table: 'model_generations', receivedAt: 0, environment: 0 },
      ],
    });
  });

  it('takes received_at from date_created and keeps values that were recorded', async () => {
    const events = await selectRows(
      database,
      `SELECT id, received_at = date_created AS from_date_created, environment, journey_id, occurred_at
         FROM events ORDER BY id`
    );
    expect(events).toEqual([
      legacyEvent('00000000-0000-4000-8000-000000000001'),
      legacyEvent('00000000-0000-4000-8000-000000000002'),
      legacyEvent('00000000-0000-4000-8000-000000000003'),
      {
        id: '00000000-0000-4000-8000-000000000004',
        from_date_created: false,
        environment: 'staging',
        journey_id: 'journey-recorded',
        occurred_at: new Date('2026-10-15T09:59:58.000Z'),
      },
    ]);

    const exchanges = await selectRows(
      database,
      `SELECT id, received_at = date_created AS from_date_created, environment, analytics_excluded
         FROM chat_exchanges ORDER BY id`
    );
    expect(exchanges).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000011',
        from_date_created: true,
        environment: 'staging',
        analytics_excluded: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000012',
        from_date_created: true,
        environment: 'staging',
        analytics_excluded: true,
      },
      {
        id: '00000000-0000-4000-8000-000000000013',
        from_date_created: false,
        environment: 'staging',
        analytics_excluded: false,
      },
    ]);
  });

  it('summarizes the history through the scheduled job without duplicates', async () => {
    const analytics = requireAnalyticsDatabase(database);
    const config: AnalyticsJobConfig = { analyticsEnvironment: 'staging' };

    expect(await runAnalyticsJobs(analytics, nextMorning, config)).toEqual({
      rolledUpDays: ['2026-10-14', '2026-10-15'],
      purgedBefore: null,
    });
    expect(await runAnalyticsJobs(analytics, nextMorning, config)).toEqual({
      rolledUpDays: ['2026-10-15'],
      purgedBefore: null,
    });

    const days = await selectRows(
      database,
      `SELECT day::text AS day, environment, page_views, visitors, outcome_answered
         FROM daily_stats ORDER BY day`
    );
    expect(days).toEqual([
      {
        day: '2026-10-13',
        environment: 'staging',
        page_views: 4,
        visitors: 2,
        outcome_answered: 0,
      },
      {
        day: '2026-10-14',
        environment: 'staging',
        page_views: 2,
        visitors: 2,
        outcome_answered: 1,
      },
      {
        day: '2026-10-15',
        environment: 'staging',
        page_views: 1,
        visitors: 1,
        outcome_answered: 1,
      },
    ]);
  });

  it('reports the rollup status, with its timestamps and progress, to the diagnostic panel', async () => {
    await database('analytics_status').insert({
      id: crypto.randomUUID(),
      component: 'retention',
      environment: 'staging',
      last_refresh_at: '2026-10-16T02:30:00.000Z',
    });
    const service = new AnalyticsDataService(requireAnalyticsDatabase(database));

    const summary = await service.loadSummary({ environment: 'staging' }, nextMorning);

    expect(summary.coverage.analytics_status).toMatchObject({
      component: 'rollup',
      environment: 'staging',
      last_refresh_at: expect.stringMatching(isoTimestamp),
      last_success_at: expect.stringMatching(isoTimestamp),
      progress_details: '{"days":"2026-10-15"}',
    });
  });

  it('starts the first summaries at the earliest stored telemetry', async () => {
    await database('daily_stats').del();

    expect(
      await runAnalyticsJobs(requireAnalyticsDatabase(database), nextMorning, {
        analyticsEnvironment: 'staging',
      })
    ).toEqual({ rolledUpDays: ['2026-10-14', '2026-10-15'], purgedBefore: null });
  });
});

describe('analytics storage with conflicting summaries', () => {
  const schema = `analytics_conflict_${uniqueSuffix()}`;
  const admin = createIntegrationDatabase();
  const database = createIntegrationDatabase(schema);

  beforeAll(async () => {
    await admin.raw('CREATE SCHEMA ??', [schema]);
    for (const table of ['daily_stats', 'events', 'chat_exchanges', 'model_generations']) {
      await admin.raw('CREATE TABLE ??.?? (LIKE public.?? INCLUDING DEFAULTS)', [
        schema,
        table,
        table,
      ]);
    }
    await database.raw('ALTER TABLE daily_stats ALTER COLUMN day TYPE varchar(255)');
    await database('daily_stats').insert([
      { id: crypto.randomUUID(), day: '2026-10-14', environment: 'staging', page_views: 1 },
      { id: crypto.randomUUID(), day: '2026-10-14', environment: 'staging', page_views: 2 },
    ]);
  });

  afterAll(async () => {
    await database.destroy();
    await admin.raw('DROP SCHEMA ?? CASCADE', [schema]);
    await admin.destroy();
  });

  it('refuses to choose between two summaries of the same day and changes nothing', async () => {
    await expect(migrateAnalyticsStorage(database, 'staging', ignoreLog)).rejects.toThrow(
      'daily_stats has several rows for the same day and environment (2026-10-14/staging)'
    );
    expect(await dayColumnType(database, schema)).toBe('character varying');
    expect(await uniqueKeys(database, schema)).toEqual([]);
  });
});

function legacyEvent(id: string) {
  return {
    id,
    from_date_created: true,
    environment: 'staging',
    journey_id: null,
    occurred_at: null,
  };
}

async function seedLegacyHistory(database: Knex): Promise<void> {
  await database('daily_stats').insert({
    id: crypto.randomUUID(),
    day: '2026-10-13',
    page_views: 4,
    visitors: 2,
    outcome_answered: 0,
  });
  await database('events').insert([
    legacyEventRow(
      '00000000-0000-4000-8000-000000000001',
      'page_view',
      'visitor-a',
      '2026-10-14T08:00:00.000Z'
    ),
    legacyEventRow(
      '00000000-0000-4000-8000-000000000002',
      'page_view',
      'visitor-b',
      '2026-10-14T09:00:00.000Z'
    ),
    legacyEventRow(
      '00000000-0000-4000-8000-000000000003',
      'block_view',
      'visitor-a',
      '2026-10-14T09:05:00.000Z'
    ),
    {
      ...legacyEventRow(
        '00000000-0000-4000-8000-000000000004',
        'page_view',
        'visitor-c',
        '2026-10-15T10:00:01.000Z'
      ),
      received_at: '2026-10-15T10:00:00.000Z',
      occurred_at: '2026-10-15T09:59:58.000Z',
      journey_id: 'journey-recorded',
      environment: 'staging',
    },
  ]);
  await database('chat_exchanges').insert([
    legacyExchangeRow('00000000-0000-4000-8000-000000000011', '2026-10-14T09:10:00.000Z', false),
    legacyExchangeRow('00000000-0000-4000-8000-000000000012', '2026-10-14T09:20:00.000Z', true),
    {
      ...legacyExchangeRow(
        '00000000-0000-4000-8000-000000000013',
        '2026-10-15T10:05:01.000Z',
        false
      ),
      received_at: '2026-10-15T10:05:00.000Z',
      environment: 'local',
    },
  ]);
}

function legacyEventRow(id: string, type: string, visitorHash: string, dateCreated: string) {
  return {
    id,
    type,
    path: '/',
    device_class: 'desktop',
    visitor_hash: visitorHash,
    date_created: dateCreated,
  };
}

function legacyExchangeRow(id: string, dateCreated: string, excluded: boolean) {
  return {
    id,
    locale: 'en',
    question: '[redacted]',
    mode: 'scripted',
    outcome: 'answered',
    analytics_excluded: excluded,
    date_created: dateCreated,
  };
}

async function uniqueKeys(
  database: Knex,
  schema: string
): Promise<{ name: string; columns: string[] }[]> {
  const rows = await selectRows(
    database,
    `SELECT unique_constraint.conname AS name,
            array_to_json(ARRAY(
              SELECT attribute.attname::text
                FROM unnest(unique_constraint.conkey) AS key(attnum)
                JOIN pg_attribute AS attribute
                  ON attribute.attrelid = unique_constraint.conrelid AND attribute.attnum = key.attnum
               ORDER BY attribute.attname
            )) AS columns
       FROM pg_constraint AS unique_constraint
       JOIN pg_class AS table_class ON table_class.oid = unique_constraint.conrelid
       JOIN pg_namespace AS namespace ON namespace.oid = table_class.relnamespace
      WHERE namespace.nspname = ? AND table_class.relname = 'daily_stats'
        AND unique_constraint.contype = 'u'
      ORDER BY unique_constraint.conname`,
    [schema]
  );
  return rows.map((row) => ({ name: String(row.name), columns: readStrings(row.columns) }));
}

async function dayColumnType(database: Knex, schema: string): Promise<string> {
  const rows = await selectRows(
    database,
    `SELECT data_type FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'daily_stats' AND column_name = 'day'`,
    [schema]
  );
  return String(rows[0]?.data_type);
}

async function selectRows(
  database: Knex,
  sql: string,
  bindings: readonly string[] = []
): Promise<Record<string, unknown>[]> {
  const result: unknown = await database.raw(sql, bindings);
  if (result === null || typeof result !== 'object' || !('rows' in result)) {
    throw new Error('Postgres returned no rows.');
  }
  const rows: unknown = result.rows;
  if (!Array.isArray(rows)) {
    throw new Error('Postgres returned no rows.');
  }
  return rows.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === 'object' && !Array.isArray(row)
  );
}

function readStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}
