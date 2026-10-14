import { describe, expect, it, vi } from 'vitest';

import { createSearchConsoleClient } from './search-console-client.ts';

describe('createSearchConsoleClient', () => {
  it('pages through Search Console rows until a short page arrives', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const body: unknown = JSON.parse(String(init?.body));
      const startRow = isRecord(body) && typeof body.startRow === 'number' ? body.startRow : 0;
      const rows =
        startRow === 0
          ? Array.from({ length: 25_000 }, (_entry, index) => ({
              keys: ['2026-10-14', `query-${index}`, '/page', 'fra', 'MOBILE'],
              clicks: 1,
              impressions: 2,
              ctr: 0.5,
              position: 3,
            }))
          : [
              {
                keys: ['2026-10-14', 'tail', '/page', 'fra', 'MOBILE'],
                clicks: 1,
                impressions: 2,
                ctr: 0.5,
                position: 3,
              },
            ];
      return Response.json({ rows });
    });
    const client = createSearchConsoleClient({
      property: 'sc-domain:example.com',
      accessToken: async () => 'token',
      fetchImpl,
    });
    const rows = await client.queryRange('2026-10-04', '2026-10-14');
    expect(rows).toHaveLength(25_001);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
