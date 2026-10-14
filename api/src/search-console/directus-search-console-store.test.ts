import { describe, expect, it, vi } from 'vitest';

import { createDirectusSearchConsoleStore } from './directus-search-console-store.ts';
import { buildSearchConsoleRowKey } from './search-console-row-key.ts';

describe('createDirectusSearchConsoleStore', () => {
  it('creates new rows and skips unchanged metrics on rerun', async () => {
    const storedRows: {
      id: string;
      row_key: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }[] = [];
    const fetchImpl = vi.fn(async (url, init) => {
      if (
        typeof url === 'string' &&
        url.includes('/items/search_console_rows') &&
        init?.method === 'POST'
      ) {
        return Response.json({ data: { id: 'row-1' } });
      }
      if (typeof url === 'string' && url.includes('/items/search_console_rows/row-1')) {
        return Response.json({ data: { id: 'row-1' } });
      }
      if (typeof url === 'string' && url.includes('/items/search_console_rows')) {
        return Response.json({ data: storedRows });
      }
      return Response.json({ data: [] });
    });
    const store = createDirectusSearchConsoleStore('https://cms.example.com', 'token', fetchImpl);
    const row = {
      date: '2026-10-14',
      query: 'portfolio',
      page: 'https://example.com/',
      country: 'fra',
      device: 'DESKTOP',
      clicks: 1,
      impressions: 2,
      ctr: 0.5,
      position: 3,
    };
    const rowKey = buildSearchConsoleRowKey({
      date: row.date,
      query: row.query,
      page: row.page,
      country: row.country,
      device: row.device,
    });
    await store.upsertRows([row]);
    storedRows.push({
      id: 'row-1',
      row_key: rowKey,
      clicks: 1,
      impressions: 2,
      ctr: 0.5,
      position: 3,
    });
    const unchanged = await store.upsertRows([row]);
    expect(unchanged).toEqual({ created: 0, updated: 0 });
    const updated = await store.upsertRows([{ ...row, clicks: 2 }]);
    expect(updated).toEqual({ created: 0, updated: 1 });
  });

  it('creates a repeated row key once with its latest metrics', async () => {
    const createdBodies: string[] = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'POST' && typeof init.body === 'string') {
        createdBodies.push(init.body);
        return Response.json({ data: { id: 'row-1' } });
      }
      return Response.json({ data: [] });
    });
    const store = createDirectusSearchConsoleStore('https://cms.example.com', 'token', fetchImpl);
    const row = {
      date: '2026-10-14',
      query: 'portfolio',
      page: 'https://example.com/',
      country: 'fra',
      device: 'DESKTOP',
      clicks: 1,
      impressions: 2,
      ctr: 0.5,
      position: 3,
    };

    const outcome = await store.upsertRows([row, { ...row, clicks: 2 }]);

    expect(outcome).toEqual({ created: 1, updated: 0 });
    expect(createdBodies).toHaveLength(1);
    expect(createdBodies[0]).toContain('"clicks":2');
  });
});
