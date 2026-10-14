import { z } from 'zod';

import { parisDayUtcRange } from '../time/paris-calendar.ts';
import type { DailyStatsSnapshot } from './daily-stats-types.ts';

const aggregateCountSchema = z.object({
  data: z
    .array(
      z.object({
        count: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
        countDistinct: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
      })
    )
    .optional(),
});

const sumResponseSchema = z.object({
  data: z
    .array(
      z.object({
        sum: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
      })
    )
    .optional(),
});

const groupResponseSchema = z.object({
  data: z
    .array(
      z.object({
        outcome: z.string().optional(),
        count: z.object({ id: z.union([z.string(), z.number()]).optional() }).optional(),
      })
    )
    .optional(),
});

export type DailyStatsSource = {
  computeDay(dayKey: string): Promise<DailyStatsSnapshot>;
  upsertDay(snapshot: DailyStatsSnapshot): Promise<void>;
};

export function createDirectusDailyStatsSource(
  directusUrl: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch
): DailyStatsSource {
  const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;
  return {
    computeDay: (dayKey) => computeDailyStats(baseUrl, apiToken, dayKey, fetchImpl),
    upsertDay: (snapshot) => upsertDailyStats(baseUrl, apiToken, snapshot, fetchImpl),
  };
}

async function computeDailyStats(
  baseUrl: string,
  apiToken: string,
  dayKey: string,
  fetchImpl: typeof fetch
): Promise<DailyStatsSnapshot> {
  const range = parisDayUtcRange(dayKey);
  const eventFilter = eventDateFilter(range.startIso, range.endIso);
  const exchangeFilter = exchangeDateFilter(range.startIso, range.endIso);
  const alertFilter = alertDateFilter(range.startIso, range.endIso);
  const searchFilter = searchDateFilter(dayKey);
  const visitors = await countDistinct(
    baseUrl,
    apiToken,
    'events',
    'visitor_hash',
    `${eventFilter}&filter[type][_eq]=page_view`,
    fetchImpl
  );
  const pageViews = await countRows(
    baseUrl,
    apiToken,
    'events',
    `${eventFilter}&filter[type][_eq]=page_view`,
    fetchImpl
  );
  const conversations = await countDistinct(
    baseUrl,
    apiToken,
    'chat_exchanges',
    'conversation_id',
    exchangeFilter,
    fetchImpl
  );
  const modelExchanges = await countRows(
    baseUrl,
    apiToken,
    'chat_exchanges',
    `${exchangeFilter}&filter[mode][_eq]=model`,
    fetchImpl
  );
  const scriptedExchanges = await countRows(
    baseUrl,
    apiToken,
    'chat_exchanges',
    `${exchangeFilter}&filter[mode][_eq]=scripted`,
    fetchImpl
  );
  const outcomes = await readOutcomeCounts(baseUrl, apiToken, exchangeFilter, fetchImpl);
  const contactMessages = await countRows(
    baseUrl,
    apiToken,
    'alerts',
    `${alertFilter}&filter[kind][_eq]=contact_message`,
    fetchImpl
  );
  const cvDownloads = await countRows(
    baseUrl,
    apiToken,
    'events',
    `${eventFilter}&filter[type][_eq]=cv_download`,
    fetchImpl
  );
  const impressions = await sumField(
    baseUrl,
    apiToken,
    'search_console_rows',
    'impressions',
    searchFilter,
    fetchImpl
  );
  const clicks = await sumField(
    baseUrl,
    apiToken,
    'search_console_rows',
    'clicks',
    searchFilter,
    fetchImpl
  );
  const weightedPosition = await sumWeightedPosition(baseUrl, apiToken, searchFilter, fetchImpl);
  const modelCostEur = await sumField(
    baseUrl,
    apiToken,
    'chat_exchanges',
    'cost_eur',
    exchangeFilter,
    fetchImpl
  );
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  const averagePosition = impressions === 0 ? 0 : weightedPosition / impressions;
  return {
    day: dayKey,
    visitors,
    pageViews,
    conversations,
    modelExchanges,
    scriptedExchanges,
    outcomeAnswered: outcomes.answered,
    outcomeUnknown: outcomes.unknown,
    outcomeSensitive: outcomes.sensitive,
    outcomeRefused: outcomes.refused,
    contactMessages,
    cvDownloads,
    impressions,
    clicks,
    ctr,
    averagePosition,
    modelCostEur,
  };
}

function eventDateFilter(startIso: string, endIso: string): string {
  return `filter[date_created][_gte]=${encodeURIComponent(startIso)}&filter[date_created][_lt]=${encodeURIComponent(endIso)}`;
}

function exchangeDateFilter(startIso: string, endIso: string): string {
  return eventDateFilter(startIso, endIso);
}

function alertDateFilter(startIso: string, endIso: string): string {
  return eventDateFilter(startIso, endIso);
}

function searchDateFilter(dayKey: string): string {
  return `filter[date][_eq]=${encodeURIComponent(dayKey)}`;
}

async function countRows(
  baseUrl: string,
  apiToken: string,
  collection: string,
  filterQuery: string,
  fetchImpl: typeof fetch
): Promise<number> {
  const query = `aggregate[count]=id&${filterQuery}`;
  const response = await fetchImpl(`${baseUrl}/items/${collection}?${query}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus count failed for ${collection} with status ${response.status}.`);
  }
  const payload = aggregateCountSchema.parse(await response.json());
  return readAggregateCount(payload.data?.[0]);
}

async function countDistinct(
  baseUrl: string,
  apiToken: string,
  collection: string,
  field: string,
  filterQuery: string,
  fetchImpl: typeof fetch
): Promise<number> {
  const query = `aggregate[countDistinct]=${field}&${filterQuery}`;
  const response = await fetchImpl(`${baseUrl}/items/${collection}?${query}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `Directus distinct count failed for ${collection} with status ${response.status}.`
    );
  }
  const payload = aggregateCountSchema.parse(await response.json());
  return readDistinctCount(payload.data?.[0], field);
}

async function sumField(
  baseUrl: string,
  apiToken: string,
  collection: string,
  field: string,
  filterQuery: string,
  fetchImpl: typeof fetch
): Promise<number> {
  const query = `aggregate[sum]=${field}&${filterQuery}`;
  const response = await fetchImpl(`${baseUrl}/items/${collection}?${query}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus sum failed for ${collection} with status ${response.status}.`);
  }
  const payload = sumResponseSchema.parse(await response.json());
  const raw = payload.data?.[0]?.sum?.[field];
  return readNumber(raw);
}

async function sumWeightedPosition(
  baseUrl: string,
  apiToken: string,
  filterQuery: string,
  fetchImpl: typeof fetch
): Promise<number> {
  const query = `fields=position,impressions&limit=-1&${filterQuery}`;
  const response = await fetchImpl(`${baseUrl}/items/search_console_rows?${query}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus Search Console read failed with status ${response.status}.`);
  }
  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return 0;
  }
  return payload.data.reduce((total: number, row: unknown) => {
    if (!isRecord(row)) {
      return total;
    }
    const position = readNumber(row.position);
    const impressions = readNumber(row.impressions);
    return total + position * impressions;
  }, 0);
}

async function readOutcomeCounts(
  baseUrl: string,
  apiToken: string,
  filterQuery: string,
  fetchImpl: typeof fetch
): Promise<{ answered: number; unknown: number; sensitive: number; refused: number }> {
  const query = `aggregate[count]=id&groupBy[]=outcome&${filterQuery}`;
  const response = await fetchImpl(`${baseUrl}/items/chat_exchanges?${query}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus outcome grouping failed with status ${response.status}.`);
  }
  const payload = groupResponseSchema.parse(await response.json());
  const counts = { answered: 0, unknown: 0, sensitive: 0, refused: 0 };
  for (const row of payload.data ?? []) {
    const outcome = row.outcome ?? '';
    const count = readCount(row.count?.id);
    if (outcome === 'answered') {
      counts.answered = count;
    }
    if (outcome === 'unknown') {
      counts.unknown = count;
    }
    if (outcome === 'sensitive') {
      counts.sensitive = count;
    }
    if (outcome === 'refused') {
      counts.refused = count;
    }
  }
  return counts;
}

async function upsertDailyStats(
  baseUrl: string,
  apiToken: string,
  snapshot: DailyStatsSnapshot,
  fetchImpl: typeof fetch
): Promise<void> {
  const existingId = await readDailyStatsId(baseUrl, apiToken, snapshot.day, fetchImpl);
  const body = {
    day: snapshot.day,
    visitors: snapshot.visitors,
    page_views: snapshot.pageViews,
    conversations: snapshot.conversations,
    model_exchanges: snapshot.modelExchanges,
    scripted_exchanges: snapshot.scriptedExchanges,
    outcome_answered: snapshot.outcomeAnswered,
    outcome_unknown: snapshot.outcomeUnknown,
    outcome_sensitive: snapshot.outcomeSensitive,
    outcome_refused: snapshot.outcomeRefused,
    contact_messages: snapshot.contactMessages,
    cv_downloads: snapshot.cvDownloads,
    impressions: snapshot.impressions,
    clicks: snapshot.clicks,
    ctr: snapshot.ctr,
    average_position: snapshot.averagePosition,
    model_cost_eur: snapshot.modelCostEur,
  };
  if (existingId === null) {
    const response = await fetchImpl(`${baseUrl}/items/daily_stats`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Directus daily stats create failed with status ${response.status}.`);
    }
    return;
  }
  const response = await fetchImpl(`${baseUrl}/items/daily_stats/${existingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Directus daily stats update failed with status ${response.status}.`);
  }
}

async function readDailyStatsId(
  baseUrl: string,
  apiToken: string,
  dayKey: string,
  fetchImpl: typeof fetch
): Promise<string | null> {
  const query = new URLSearchParams({
    fields: 'id',
    limit: '1',
    'filter[day][_eq]': dayKey,
  });
  const response = await fetchImpl(`${baseUrl}/items/daily_stats?${query.toString()}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus daily stats read failed with status ${response.status}.`);
  }
  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return null;
  }
  const row = payload.data[0];
  if (!isRecord(row) || typeof row.id !== 'string') {
    return null;
  }
  return row.id;
}

function readAggregateCount(
  row:
    | {
        count?: Record<string, string | number | null>;
        countDistinct?: Record<string, string | number | null>;
      }
    | undefined
): number {
  if (row === undefined) {
    return 0;
  }
  const bucket = row.count;
  if (bucket === undefined) {
    return 0;
  }
  const values = Object.values(bucket);
  return readCount(values[0]);
}

function readDistinctCount(
  row:
    | {
        count?: Record<string, string | number | null>;
        countDistinct?: Record<string, string | number | null>;
      }
    | undefined,
  field: string
): number {
  if (row === undefined) {
    return 0;
  }
  const bucket = row.countDistinct;
  if (bucket === undefined) {
    return 0;
  }
  return readCount(bucket[field]);
}

function readCount(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) {
    return 0;
  }
  if (typeof raw === 'number') {
    return raw;
  }
  return Number.parseInt(raw, 10);
}

function readNumber(raw: unknown): number {
  if (raw === null || raw === undefined) {
    return 0;
  }
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    return Number.parseFloat(raw);
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
