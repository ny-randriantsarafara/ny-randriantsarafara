import { z } from 'zod';

const queryResponseSchema = z.object({
  rows: z
    .array(
      z.object({
        keys: z.array(z.string()),
        clicks: z.number(),
        impressions: z.number(),
        ctr: z.number(),
        position: z.number(),
      })
    )
    .optional(),
});

export type SearchConsoleApiRow = {
  date: string;
  query: string;
  page: string;
  country: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleClient = {
  queryRange(startDate: string, endDate: string): Promise<SearchConsoleApiRow[]>;
};

export type SearchConsoleClientDependencies = {
  property: string;
  accessToken: () => Promise<string>;
  fetchImpl: typeof fetch;
};

const ROW_LIMIT = 25_000;
const DATA_STATE = 'final';

export function createSearchConsoleClient(
  dependencies: SearchConsoleClientDependencies
): SearchConsoleClient {
  return {
    queryRange: (startDate, endDate) => queryAllRows(dependencies, startDate, endDate, 0, []),
  };
}

async function queryAllRows(
  dependencies: SearchConsoleClientDependencies,
  startDate: string,
  endDate: string,
  startRow: number,
  collected: SearchConsoleApiRow[]
): Promise<SearchConsoleApiRow[]> {
  const page = await queryPage(dependencies, startDate, endDate, startRow);
  const merged = collected.concat(page.rows);
  if (page.rows.length < ROW_LIMIT) {
    return merged;
  }
  return queryAllRows(dependencies, startDate, endDate, startRow + ROW_LIMIT, merged);
}

async function queryPage(
  dependencies: SearchConsoleClientDependencies,
  startDate: string,
  endDate: string,
  startRow: number
): Promise<{ rows: SearchConsoleApiRow[] }> {
  const token = await dependencies.accessToken();
  const encodedProperty = encodeURIComponent(dependencies.property);
  const response = await dependencies.fetchImpl(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedProperty}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['date', 'query', 'page', 'country', 'device'],
        rowLimit: ROW_LIMIT,
        startRow,
        dataState: DATA_STATE,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Search Console query failed with status ${response.status}.`);
  }
  const payload = queryResponseSchema.parse(await response.json());
  return { rows: (payload.rows ?? []).map(parseApiRow) };
}

function parseApiRow(row: {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}): SearchConsoleApiRow {
  const [date = '', query = '', page = '', country = '', device = ''] = row.keys;
  return {
    date,
    query,
    page,
    country,
    device,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  };
}
