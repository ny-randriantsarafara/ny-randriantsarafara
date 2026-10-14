import { describe, expect, it, vi } from 'vitest';

import { createDirectusDailyStatsSource } from './directus-daily-stats-source.ts';

describe('createDirectusDailyStatsSource', () => {
  it('computes ctr and average position from aggregated Search Console rows', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (typeof url !== 'string') {
        return Response.json({ data: [] });
      }
      if (url.includes('aggregate[countDistinct]=visitor_hash')) {
        return Response.json({ data: [{ countDistinct: { visitor_hash: '2' } }] });
      }
      if (
        url.includes('aggregate[count]=id') &&
        url.includes('chat_exchanges') &&
        url.includes('groupBy')
      ) {
        return Response.json({
          data: [{ outcome: 'answered', count: { id: '1' } }],
        });
      }
      if (url.includes('aggregate[count]=id')) {
        return Response.json({ data: [{ count: { id: '3' } }] });
      }
      if (url.includes('aggregate[sum]=impressions')) {
        return Response.json({ data: [{ sum: { impressions: '100' } }] });
      }
      if (url.includes('aggregate[sum]=clicks')) {
        return Response.json({ data: [{ sum: { clicks: '10' } }] });
      }
      if (url.includes('aggregate[sum]=cost_eur')) {
        return Response.json({ data: [{ sum: { cost_eur: '1.5' } }] });
      }
      if (url.includes('search_console_rows') && url.includes('fields=position')) {
        return Response.json({
          data: [
            { position: 2, impressions: 50 },
            { position: 4, impressions: 50 },
          ],
        });
      }
      if (url.includes('/items/daily_stats')) {
        return Response.json({ data: [] });
      }
      return Response.json({ data: [{ count: { id: '0' } }] });
    });
    const source = createDirectusDailyStatsSource('https://cms.example.com', 'token', fetchImpl);
    const snapshot = await source.computeDay('2026-10-14');
    expect(snapshot.visitors).toBe(2);
    expect(snapshot.pageViews).toBe(3);
    expect(snapshot.ctr).toBeCloseTo(0.1);
    expect(snapshot.averagePosition).toBeCloseTo(3);
    expect(snapshot.modelCostEur).toBeCloseTo(1.5);
  });
});
