import { describe, expect, it, vi } from 'vitest';

import { createAnalyticsDatabaseDouble } from '../test-support/knex-double.ts';
import { AnalyticsDataService } from './analytics-data-service.ts';

describe('AnalyticsDataService', () => {
  it('computes review quality counters from the filtered total, not the page slice', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      id: `x${index}`,
      received_at: '2026-01-10T10:00:00.000Z',
      locale: 'en',
      outcome: index === 0 ? 'answered' : 'unknown',
      mode: 'model',
      delivery_source: 'provider',
      model: 'test-model',
      question: '[redacted]',
      has_review: index < 2,
    }));
    const database = createListConversationsDatabase(rows, 30, {
      reviewed: 12,
      outcome_answered: 8,
    });
    const service = new AnalyticsDataService(database);
    const page = await service.listConversations({}, 1, 10);
    expect(page.data).toHaveLength(10);
    expect(page.total).toBe(30);
    expect(page.reviewSummary.listed).toBe(30);
    expect(page.reviewSummary.reviewed).toBe(12);
    expect(page.reviewSummary.outcome_answered).toBe(8);
  });

  it('builds a fresh Knex builder for count and select (aggregate reuse would throw)', async () => {
    const rows = [
      {
        id: 'x1',
        received_at: '2026-01-10T10:00:00.000Z',
        locale: 'en',
        outcome: 'answered',
        mode: 'model',
        delivery_source: 'provider',
        model: 'test-model',
        question: '[redacted]',
        has_review: false,
      },
    ];
    const database = createListConversationsDatabase(rows, 1);
    const service = new AnalyticsDataService(database);
    const page = await service.listConversations({}, 1, 10);
    expect(page.data).toHaveLength(1);
    expect(database.builderCreations()).toBeGreaterThanOrEqual(4);
  });

  it('paginates conversations with allowlisted locale filters', async () => {
    const rows = [
      {
        id: 'x1',
        received_at: '2026-01-10T10:00:00.000Z',
        locale: 'en',
        outcome: 'answered',
        mode: 'model',
        delivery_source: 'provider',
        model: 'test-model',
        question: '[redacted]',
        has_review: false,
      },
    ];
    const database = createListConversationsDatabase(rows, 1);
    const service = new AnalyticsDataService(database);
    const page = await service.listConversations({ locale: 'en' }, 1, 10);
    expect(page.total).toBe(1);
    expect(page.data).toHaveLength(1);
    expect(database.lastBindings).toContain('en');
  });

  it('upserts owner review tags and stores redacted notes', async () => {
    const database = createReviewDatabase();
    const service = new AnalyticsDataService(database);
    const saved = await service.upsertReview(
      'exchange-1',
      ['supported'],
      'Reach me at a@b.com',
      'owner-1'
    );
    expect(saved.tags).toEqual(['supported']);
    if (saved.notes !== null) {
      expect(saved.notes).not.toContain('a@b.com');
    }
    if (database.insertedNotes !== null) {
      expect(database.insertedNotes).not.toContain('a@b.com');
    }
  });

  it('updates an existing owner review instead of inserting a duplicate row', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockResolvedValue(undefined);
    const database = createReviewDatabaseWithExisting({ update, insert });
    const service = new AnalyticsDataService(database);
    const saved = await service.upsertReview(
      'exchange-1',
      ['unsupported_claim'],
      'Updated note',
      'owner-1'
    );
    expect(saved.id).toBe('review-existing');
    expect(saved.tags).toEqual(['unsupported_claim']);
    expect(update).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it('loads browser-local fallback from event request_id and payload.text', async () => {
    const { database, eventWhereFilters } = createConversationDetailWithFallbackDatabase();
    const service = new AnalyticsDataService(database);
    const detail = await service.loadConversationDetail('exchange-1');
    expect(detail).not.toBeNull();
    expect(detail?.local_fallback).toBe('Fallback answer shown in browser');
    expect(eventWhereFilters).toEqual([
      {
        type: 'chat_local_fallback',
        request_id: 'request-1',
      },
    ]);
  });

  it('returns null for analytics-excluded conversation detail', async () => {
    let exclusionSql = '';
    const database = createConversationDetailDatabase({
      excluded: true,
      onWhereRaw: (sql) => {
        exclusionSql = sql;
      },
    });
    const service = new AnalyticsDataService(database);
    const detail = await service.loadConversationDetail('excluded-1');
    expect(detail).toBeNull();
    expect(exclusionSql).toContain('analytics_excluded');
  });
});

type ConversationRow = {
  id: string;
  received_at: string;
  locale: string;
  outcome: string;
  mode: string;
  delivery_source: string;
  model: string;
  question: string;
  has_review: boolean;
};

type ReviewSummaryCounts = {
  reviewed: number;
  outcome_answered: number;
};

type ListConversationsDatabase = ReturnType<typeof createAnalyticsDatabaseDouble> & {
  lastBindings: unknown[];
  builderCreations: () => number;
};

function createListConversationsDatabase(
  rows: ConversationRow[],
  total: number,
  summary?: ReviewSummaryCounts
): ListConversationsDatabase {
  const lastBindings: unknown[] = [];
  const builderCreations: unknown[] = [];
  const state = { lastBindings, builderCreations };

  function createConversationQueryBuilder(): AnalyticsQueryBuilderLike {
    const builderState = { aggregated: false };
    const builder: AnalyticsQueryBuilderLike = {
      whereRaw(sql: string, bindings?: unknown[]) {
        if (bindings !== undefined) {
          state.lastBindings.push(...bindings);
        }
        if (sql.includes('EXISTS')) {
          return {
            count: () => ({
              first: async () => ({ count: String(summary?.reviewed ?? 0) }),
            }),
          };
        }
        return builder;
      },
      where(criteria: Record<string, string>) {
        if ('outcome' in criteria) {
          return {
            count: () => ({
              first: async () => ({ count: String(summary?.outcome_answered ?? 0) }),
            }),
          };
        }
        return builder;
      },
      clone() {
        return builder;
      },
      count: () => {
        builderState.aggregated = true;
        return {
          first: async () => ({ count: String(total) }),
        };
      },
      select: () => {
        if (builderState.aggregated) {
          throw new Error('Knex builder already consumed by count(); select is invalid.');
        }
        return builder;
      },
      orderBy: () => builder,
      limit: () => builder,
      offset: async () => rows,
    };
    return builder;
  }

  const database = createAnalyticsDatabaseDouble((table) => {
    if (table !== 'chat_exchanges') {
      throw new Error(`Unexpected table ${table}`);
    }
    state.builderCreations.push(null);
    return createConversationQueryBuilder();
  });
  database.raw = () => 'exists_clause';
  return Object.assign(database, {
    lastBindings: state.lastBindings,
    builderCreations: () => state.builderCreations.length,
  });
}

type AnalyticsQueryBuilderLike = {
  whereRaw: (
    sql: string,
    bindings?: unknown[]
  ) => AnalyticsQueryBuilderLike | { count: () => { first: () => Promise<{ count: string }> } };
  where: (
    criteria: Record<string, string>
  ) => AnalyticsQueryBuilderLike | { count: () => { first: () => Promise<{ count: string }> } };
  clone: () => AnalyticsQueryBuilderLike;
  count: () => { first: () => Promise<{ count: string }> };
  select: () => AnalyticsQueryBuilderLike;
  orderBy: () => AnalyticsQueryBuilderLike;
  limit: () => AnalyticsQueryBuilderLike;
  offset: () => Promise<ConversationRow[]>;
};

function createReviewDatabase(): ReturnType<typeof createAnalyticsDatabaseDouble> & {
  insertedNotes: string | null;
} {
  const state: { insertedNotes: string | null } = { insertedNotes: null };
  const database = createAnalyticsDatabaseDouble((table) => {
    if (table === 'chat_reviews') {
      return {
        where: () => ({
          first: async () => undefined,
        }),
        insert: async (payload: { notes: string | null }) => {
          state.insertedNotes = payload.notes;
        },
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return Object.assign(database, state);
}

function createReviewDatabaseWithExisting(hooks: {
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
}): ReturnType<typeof createAnalyticsDatabaseDouble> {
  return createAnalyticsDatabaseDouble((table) => {
    if (table === 'chat_reviews') {
      return {
        where: (criteria: Record<string, string>) => ({
          first: async () => {
            if ('exchange_id' in criteria) {
              return {
                id: 'review-existing',
                date_created: '2026-01-01T00:00:00.000Z',
                user_created: 'owner-1',
              };
            }
            return undefined;
          },
          update: hooks.update,
        }),
        insert: hooks.insert,
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
}

function createConversationDetailWithFallbackDatabase(): {
  database: ReturnType<typeof createAnalyticsDatabaseDouble>;
  eventWhereFilters: Array<Record<string, string>>;
} {
  const eventWhereFilters: Array<Record<string, string>> = [];
  const database = createAnalyticsDatabaseDouble((table) => {
    if (table === 'chat_exchanges') {
      return {
        where: (criteria: Record<string, string>) => {
          if (!('id' in criteria)) {
            throw new Error(`Unexpected chat_exchanges where ${JSON.stringify(criteria)}`);
          }
          return {
            whereRaw: () => ({
              first: async () => ({
                id: 'exchange-1',
                request_id: 'request-1',
                response_text: 'Server answer',
                received_at: '2026-01-10T10:00:00.000Z',
                locale: 'en',
                outcome: 'answered',
                mode: 'scripted',
                delivery_source: 'scripted',
                model: null,
                question: '[redacted]',
                validation_status: null,
                provider_duration_ms: null,
                validation_duration_ms: null,
                failure_reason: null,
                evidence_references: null,
                publication_id: null,
                blocks: null,
                answer_slugs: null,
                latency_ms: null,
              }),
            }),
          };
        },
      };
    }
    if (table === 'events') {
      return {
        where: (criteria: Record<string, string>) => {
          eventWhereFilters.push(criteria);
          return {
            orderBy: () => ({
              first: async () => ({
                payload: { reason: 'timeout', text: 'Fallback answer shown in browser' },
              }),
            }),
          };
        },
      };
    }
    if (table === 'chat_reviews') {
      return {
        where: () => ({
          first: async () => undefined,
        }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { database, eventWhereFilters };
}

function createConversationDetailDatabase(options: {
  excluded: boolean;
  onWhereRaw: (sql: string) => void;
}): ReturnType<typeof createAnalyticsDatabaseDouble> {
  const database = createAnalyticsDatabaseDouble((table) => {
    if (table === 'chat_exchanges') {
      return {
        where: () => {
          const builder = {
            whereRaw(sql: string) {
              options.onWhereRaw(sql);
              return builder;
            },
            first: async () => (options.excluded ? undefined : { id: 'x1', response_text: null }),
          };
          return builder;
        },
      };
    }
    if (table === 'events') {
      return {
        where: () => ({
          orderBy: () => ({
            first: async () => undefined,
          }),
        }),
      };
    }
    if (table === 'chat_reviews') {
      return {
        where: () => ({
          first: async () => undefined,
        }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  database.raw = () => 'fallback_clause';
  return database;
}
