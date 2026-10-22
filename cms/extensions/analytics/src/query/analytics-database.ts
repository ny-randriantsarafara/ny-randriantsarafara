/** Minimal database surface used by analytics query code and tests. */

export type AnalyticsInsertBuilder = PromiseLike<void> & {
  onConflict(keys: readonly string[]): AnalyticsInsertBuilder;
  merge(data: Record<string, unknown>): Promise<void>;
};

export type AnalyticsQueryBuilder = PromiseLike<Record<string, unknown>[]> & {
  select(...columns: unknown[]): AnalyticsQueryBuilder;
  where(
    column: Record<string, unknown> | string | ((builder: AnalyticsQueryBuilder) => void),
    operator?: string | ((builder: AnalyticsQueryBuilder) => void),
    value?: unknown
  ): AnalyticsQueryBuilder;
  whereIn(column: string, values: unknown): AnalyticsQueryBuilder;
  orWhere(column: string, operator: string, value: unknown): AnalyticsQueryBuilder;
  whereRaw(sql: string, bindings?: readonly unknown[]): AnalyticsQueryBuilder;
  andWhereRaw(sql: string, bindings?: readonly unknown[]): AnalyticsQueryBuilder;
  orderBy(column: string, direction?: string): AnalyticsQueryBuilder;
  limit(count: number): AnalyticsQueryBuilder;
  offset(count: number): AnalyticsQueryBuilder;
  first(): Promise<Record<string, unknown> | undefined>;
  clone(): AnalyticsQueryBuilder;
  count(column?: string): AnalyticsQueryBuilder;
  max(column: string): AnalyticsQueryBuilder;
  min(column: string): AnalyticsQueryBuilder;
  insert(data: Record<string, unknown>): AnalyticsInsertBuilder;
  update(data: Record<string, unknown>): Promise<void>;
  del(): Promise<void>;
};

export interface AnalyticsDatabase {
  (table: string): AnalyticsQueryBuilder;
  raw(
    sql: string,
    bindings?: readonly unknown[]
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
}

function readCallableProperty(target: unknown, key: string): unknown {
  if (typeof target !== 'function' && (target === null || typeof target !== 'object')) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    return undefined;
  }
  return Reflect.get(target, key);
}

export function isAnalyticsDatabase(value: unknown): value is AnalyticsDatabase {
  if (typeof value !== 'function') {
    return false;
  }
  return typeof readCallableProperty(value, 'raw') === 'function';
}

export function requireAnalyticsDatabase(value: unknown): AnalyticsDatabase {
  if (!isAnalyticsDatabase(value)) {
    throw new Error('Expected a Directus database client.');
  }
  return value;
}
