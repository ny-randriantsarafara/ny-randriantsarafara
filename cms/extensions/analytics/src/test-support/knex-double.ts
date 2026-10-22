import type { AnalyticsDatabase, AnalyticsQueryBuilder } from '../query/analytics-database.ts';

/** Builds an AnalyticsDatabase test double without Knex branding. */
export function createAnalyticsDatabaseDouble(
  handler: (table: string) => AnalyticsQueryBuilder,
  raw: AnalyticsDatabase['raw'] = async () => ({ rows: [] })
): AnalyticsDatabase {
  const callable = (table: string): AnalyticsQueryBuilder => handler(table);
  return Object.assign(callable, { raw });
}
