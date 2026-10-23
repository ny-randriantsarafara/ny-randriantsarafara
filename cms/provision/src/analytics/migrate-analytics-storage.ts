import type { Knex } from 'knex';
import type { AnalyticsEnvironment } from '@portfolio/cms-schema';

import type { Log } from '../directus-client.ts';

export const dailyStatsKeyName = 'daily_stats_day_environment_unique';

const telemetryTables = ['events', 'chat_exchanges', 'model_generations'] as const;

type TelemetryTable = (typeof telemetryTables)[number];

type UniqueIndex = {
  indexName: string;
  constraintName: string | null;
  columns: string[];
};

export type TelemetryBackfill = {
  table: TelemetryTable;
  receivedAt: number;
  environment: number;
};

export type AnalyticsStorageMigration = {
  dayConverted: boolean;
  keyCreated: boolean;
  removedDayKeys: string[];
  relabelledDays: number;
  backfills: TelemetryBackfill[];
};

/**
 * Brings daily_stats and the telemetry history to the shape the analytics jobs expect. Directus
 * cannot declare a composite unique key or convert a column type, so this runs as SQL after the
 * schema is ensured. Every step checks the current state first: a second run changes nothing.
 */
export async function migrateAnalyticsStorage(
  database: Knex,
  environment: AnalyticsEnvironment,
  log: Log
): Promise<AnalyticsStorageMigration> {
  const migration = await database.transaction(async (transaction) => {
    await transaction.raw('LOCK TABLE daily_stats IN ACCESS EXCLUSIVE MODE');
    const dayConverted = await convertDayToDate(transaction);
    await refuseDuplicateDailyStats(transaction);
    const keyCreated = await ensureDayEnvironmentKey(transaction);
    const removedDayKeys = await removeDayOnlyKeys(transaction);
    const relabelledDays = await relabelLocalDays(transaction, environment);
    const backfills: TelemetryBackfill[] = [];
    for (const table of telemetryTables) {
      backfills.push(await backfillTelemetry(transaction, table, environment));
    }
    return { dayConverted, keyCreated, removedDayKeys, relabelledDays, backfills };
  });
  logMigration(migration, environment, log);
  return migration;
}

async function convertDayToDate(transaction: Knex.Transaction): Promise<boolean> {
  const rows = await selectRows(
    transaction,
    `SELECT data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'daily_stats' AND column_name = 'day'`
  );
  const dataType = readString(rows[0], 'data_type');
  if (dataType === 'date') {
    return false;
  }
  const invalid = await selectRows(
    transaction,
    `SELECT day FROM daily_stats WHERE day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' ORDER BY day LIMIT 5`
  );
  if (invalid.length > 0) {
    const days = invalid.map((row) => readString(row, 'day')).join(', ');
    throw new Error(`daily_stats.day holds values that are not dates: ${days}.`);
  }
  await transaction.raw('ALTER TABLE daily_stats ALTER COLUMN day TYPE date USING day::date');
  return true;
}

async function refuseDuplicateDailyStats(transaction: Knex.Transaction): Promise<void> {
  const duplicates = await selectRows(
    transaction,
    `SELECT day::text AS day, environment, count(*)::int AS copies
       FROM daily_stats
      GROUP BY day, environment
     HAVING count(*) > 1
      ORDER BY day
      LIMIT 5`
  );
  if (duplicates.length === 0) {
    return;
  }
  const listed = duplicates
    .map((row) => `${readString(row, 'day')}/${readString(row, 'environment')}`)
    .join(', ');
  throw new Error(
    `daily_stats has several rows for the same day and environment (${listed}). ` +
      'Remove the extra rows, then provision again.'
  );
}

async function ensureDayEnvironmentKey(transaction: Knex.Transaction): Promise<boolean> {
  const indexes = await readUniqueIndexes(transaction);
  const exists = indexes.some((index) => hasColumns(index, ['day', 'environment']));
  if (exists) {
    return false;
  }
  await transaction.raw('ALTER TABLE daily_stats ADD CONSTRAINT ?? UNIQUE (day, environment)', [
    dailyStatsKeyName,
  ]);
  return true;
}

async function removeDayOnlyKeys(transaction: Knex.Transaction): Promise<string[]> {
  const indexes = await readUniqueIndexes(transaction);
  const dayOnly = indexes.filter((index) => hasColumns(index, ['day']));
  const removed: string[] = [];
  for (const index of dayOnly) {
    removed.push(await dropUniqueIndex(transaction, index));
  }
  return removed;
}

async function dropUniqueIndex(transaction: Knex.Transaction, index: UniqueIndex): Promise<string> {
  if (index.constraintName !== null) {
    await transaction.raw('ALTER TABLE daily_stats DROP CONSTRAINT ??', [index.constraintName]);
    return index.constraintName;
  }
  await transaction.raw('DROP INDEX ??', [index.indexName]);
  return index.indexName;
}

async function readUniqueIndexes(transaction: Knex.Transaction): Promise<UniqueIndex[]> {
  const rows = await selectRows(
    transaction,
    `SELECT index_class.relname AS index_name,
            unique_constraint.conname AS constraint_name,
            array_to_json(ARRAY(
              SELECT attribute.attname::text
                FROM unnest(index_row.indkey::int2[]) WITH ORDINALITY AS key(attnum, position)
                JOIN pg_attribute AS attribute
                  ON attribute.attrelid = index_row.indrelid AND attribute.attnum = key.attnum
               ORDER BY key.position
            )) AS columns
       FROM pg_index AS index_row
       JOIN pg_class AS index_class ON index_class.oid = index_row.indexrelid
       LEFT JOIN pg_constraint AS unique_constraint
         ON unique_constraint.conindid = index_row.indexrelid
        AND unique_constraint.conrelid = index_row.indrelid
        AND unique_constraint.contype = 'u'
      WHERE index_row.indrelid = 'daily_stats'::regclass
        AND index_row.indisunique
        AND NOT index_row.indisprimary
        AND index_row.indpred IS NULL
        AND index_row.indexprs IS NULL`
  );
  return rows.map((row) => ({
    indexName: readString(row, 'index_name'),
    constraintName: readNullableString(row, 'constraint_name'),
    columns: readStringList(row, 'columns'),
  }));
}

function hasColumns(index: UniqueIndex, columns: string[]): boolean {
  const actual = [...index.columns].sort();
  const expected = [...columns].sort();
  if (actual.length !== expected.length) {
    return false;
  }
  return actual.every((column, position) => column === expected[position]);
}

/**
 * Days summarized before the environment column existed took its default, local. A day that
 * already has a row for the deployment environment keeps both rows.
 */
async function relabelLocalDays(
  transaction: Knex.Transaction,
  environment: AnalyticsEnvironment
): Promise<number> {
  if (environment === 'local') {
    return 0;
  }
  return transaction('daily_stats')
    .where({ environment: 'local' })
    .whereNotExists(
      transaction('daily_stats as labelled')
        .select(transaction.raw('1'))
        .whereRaw('labelled.day = daily_stats.day')
        .where('labelled.environment', environment)
    )
    .update({ environment });
}

/**
 * Rows stored before the analytics release have no received_at and no environment. Directus set
 * their date_created when the API stored them, and a deployed database only ever holds its own
 * environment, so both values are known. Before ANALYTICS_ENVIRONMENT was delivered, deployed
 * APIs labelled their rows local: in staging or production that label is always wrong.
 */
async function backfillTelemetry(
  transaction: Knex.Transaction,
  table: TelemetryTable,
  environment: AnalyticsEnvironment
): Promise<TelemetryBackfill> {
  const receivedAt = await transaction(table)
    .whereNull('received_at')
    .whereNotNull('date_created')
    .update({ received_at: transaction.ref('date_created') });
  const unlabelled = await transaction(table).whereNull('environment').update({ environment });
  const mislabelled = await relabelLocalRows(transaction, table, environment);
  return { table, receivedAt, environment: unlabelled + mislabelled };
}

async function relabelLocalRows(
  transaction: Knex.Transaction,
  table: TelemetryTable,
  environment: AnalyticsEnvironment
): Promise<number> {
  if (environment === 'local') {
    return 0;
  }
  return transaction(table).where({ environment: 'local' }).update({ environment });
}

function logMigration(
  migration: AnalyticsStorageMigration,
  environment: AnalyticsEnvironment,
  log: Log
): void {
  if (migration.dayConverted) {
    log('Analytics storage: daily_stats.day converted to a date');
  }
  if (migration.keyCreated) {
    log(`Analytics storage: unique key ${dailyStatsKeyName} created on (day, environment)`);
  }
  for (const name of migration.removedDayKeys) {
    log(`Analytics storage: day-only unique key ${name} removed`);
  }
  if (migration.relabelledDays > 0) {
    log(
      `Analytics storage: ${migration.relabelledDays} daily_stats rows relabelled ${environment}`
    );
  }
  for (const backfill of migration.backfills) {
    if (backfill.receivedAt === 0 && backfill.environment === 0) {
      continue;
    }
    log(
      `Analytics storage: ${backfill.table} backfilled, received_at on ${backfill.receivedAt} rows, ` +
        `environment ${environment} on ${backfill.environment} rows`
    );
  }
  log('Analytics storage ready.');
}

async function selectRows(
  transaction: Knex.Transaction,
  sql: string
): Promise<Record<string, unknown>[]> {
  const result: unknown = await transaction.raw(sql);
  if (result === null || typeof result !== 'object' || !('rows' in result)) {
    throw new Error('Postgres returned no rows.');
  }
  const rows: unknown = result.rows;
  if (!Array.isArray(rows)) {
    throw new Error('Postgres returned no rows.');
  }
  return rows.filter(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(row: Record<string, unknown> | undefined, field: string): string {
  const value = row?.[field];
  if (typeof value !== 'string') {
    throw new Error(`Postgres returned no text for ${field}.`);
  }
  return value;
}

function readNullableString(row: Record<string, unknown>, field: string): string | null {
  if (row[field] === null) {
    return null;
  }
  return readString(row, field);
}

function readStringList(row: Record<string, unknown>, field: string): string[] {
  const value = row[field];
  if (!Array.isArray(value)) {
    throw new Error(`Postgres returned no list for ${field}.`);
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}
