import { z } from 'zod';

import { buildSearchConsoleRowKey } from './search-console-row-key.ts';
import type { SearchConsoleApiRow } from './search-console-client.ts';

const listResponseSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        row_key: z.string(),
        clicks: z.number().nullable().optional(),
        impressions: z.number().nullable().optional(),
        ctr: z.number().nullable().optional(),
        position: z.number().nullable().optional(),
      })
    )
    .optional(),
});

export type SearchConsoleStore = {
  upsertRows(rows: SearchConsoleApiRow[]): Promise<{ created: number; updated: number }>;
};

export function createDirectusSearchConsoleStore(
  directusUrl: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch
): SearchConsoleStore {
  const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;
  return {
    upsertRows: (rows) => upsertSearchConsoleRows(baseUrl, apiToken, rows, fetchImpl),
  };
}

async function upsertSearchConsoleRows(
  baseUrl: string,
  apiToken: string,
  rows: SearchConsoleApiRow[],
  fetchImpl: typeof fetch
): Promise<{ created: number; updated: number }> {
  if (rows.length === 0) {
    return { created: 0, updated: 0 };
  }
  const dates = uniqueDates(rows);
  const existing = await readExistingRows(baseUrl, apiToken, dates, fetchImpl);
  const existingByKey = new Map(existing.map((row) => [row.row_key, row]));
  // row_key is unique: a key repeated across result pages must be written once, or its second create fails.
  const rowsByKey = new Map(rows.map((row) => [buildRowKey(row), row]));
  const counters = { created: 0, updated: 0 };
  for (const [rowKey, row] of rowsByKey) {
    const stored = existingByKey.get(rowKey);
    if (stored === undefined) {
      await createRow(baseUrl, apiToken, rowKey, row, fetchImpl);
      counters.created += 1;
      continue;
    }
    if (metricsChanged(stored, row)) {
      await updateRow(baseUrl, apiToken, stored.id, row, fetchImpl);
      counters.updated += 1;
    }
  }
  return counters;
}

function buildRowKey(row: SearchConsoleApiRow): string {
  return buildSearchConsoleRowKey({
    date: row.date,
    query: row.query,
    page: row.page,
    country: row.country,
    device: row.device,
  });
}

function uniqueDates(rows: SearchConsoleApiRow[]): string[] {
  return [...new Set(rows.map((row) => row.date))].toSorted();
}

async function readExistingRows(
  baseUrl: string,
  apiToken: string,
  dates: string[],
  fetchImpl: typeof fetch
): Promise<
  {
    id: string;
    row_key: string;
    clicks: number | null | undefined;
    impressions: number | null | undefined;
    ctr: number | null | undefined;
    position: number | null | undefined;
  }[]
> {
  const query = new URLSearchParams();
  query.set('fields', 'id,row_key,clicks,impressions,ctr,position');
  query.set('limit', '-1');
  query.set('filter[date][_in]', dates.join(','));
  const response = await fetchImpl(`${baseUrl}/items/search_console_rows?${query.toString()}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus Search Console read failed with status ${response.status}.`);
  }
  const payload = listResponseSchema.parse(await response.json());
  return (payload.data ?? []).map(normalizeStoredRow);
}

function normalizeStoredRow(row: {
  id: string;
  row_key: string;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
}): {
  id: string;
  row_key: string;
  clicks: number | null | undefined;
  impressions: number | null | undefined;
  ctr: number | null | undefined;
  position: number | null | undefined;
} {
  return {
    id: row.id,
    row_key: row.row_key,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  };
}

function metricsChanged(
  stored: {
    clicks: number | null | undefined;
    impressions: number | null | undefined;
    ctr: number | null | undefined;
    position: number | null | undefined;
  },
  row: SearchConsoleApiRow
): boolean {
  return (
    stored.clicks !== row.clicks ||
    stored.impressions !== row.impressions ||
    stored.ctr !== row.ctr ||
    stored.position !== row.position
  );
}

async function createRow(
  baseUrl: string,
  apiToken: string,
  rowKey: string,
  row: SearchConsoleApiRow,
  fetchImpl: typeof fetch
): Promise<void> {
  const response = await fetchImpl(`${baseUrl}/items/search_console_rows`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      row_key: rowKey,
      date: row.date,
      query: row.query,
      page: row.page,
      country: row.country,
      device: row.device,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }),
  });
  if (!response.ok) {
    throw new Error(`Directus Search Console create failed with status ${response.status}.`);
  }
}

async function updateRow(
  baseUrl: string,
  apiToken: string,
  id: string,
  row: SearchConsoleApiRow,
  fetchImpl: typeof fetch
): Promise<void> {
  const response = await fetchImpl(`${baseUrl}/items/search_console_rows/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }),
  });
  if (!response.ok) {
    throw new Error(`Directus Search Console update failed with status ${response.status}.`);
  }
}
