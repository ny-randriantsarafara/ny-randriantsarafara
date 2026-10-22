import { describe, expect, it } from 'vitest';
import { createTelemetryCollector } from './collector.ts';
import { createAnalyticsStatusReporter } from './status-reporter.ts';

describe('analytics health', () => {
  it('persists failure counters after recovery and publishes a dated heartbeat without visitor data', async () => {
    const collector = createTelemetryCollector({ log: () => {}, retryDelayMs: 0 });
    await collector.enqueue('events', 'private', async () => {
      throw new Error('visitor@example.com');
    });
    const bodies: Record<string, unknown>[] = [];
    let online = false;
    let calls = 0;
    const reporter = createAnalyticsStatusReporter({
      directusUrl: 'https://cms.example',
      apiToken: 'test',
      environment: 'local',
      collector,
      clock: () => new Date('2026-10-22T12:00:00Z'),
      log: () => {},
      fetchImpl: async (_url, init) => {
        calls++;
        if (!online) throw new Error('offline');
        bodies.push(JSON.parse(String(init?.body)));
        return Response.json({ data: {} });
      },
    });
    await reporter.publish();
    expect(calls).toBe(3);
    online = true;
    await reporter.publish();
    expect(bodies[0]).toMatchObject({
      component: 'api-collector',
      environment: 'local',
      last_refresh_at: '2026-10-22T12:00:00.000Z',
      failed: 1,
      pending: 0,
      last_failure_at: expect.any(String),
    });
    expect(JSON.stringify(bodies)).not.toContain('visitor@example');
  });
  it('coalesces concurrent health writes and updates the same process row after a lost response', async () => {
    const collector = createTelemetryCollector({ log: () => {} });
    const requests: { method: string; id: string }[] = [];
    const reporter = createAnalyticsStatusReporter({
      directusUrl: 'https://cms.example',
      apiToken: 'test',
      environment: 'local',
      collector,
      log: () => {},
      fetchImpl: async (_url, init) => {
        const row = JSON.parse(String(init?.body));
        requests.push({ method: String(init?.method), id: row.id });
        if (requests.length === 1) throw new Error('lost response');
        if (requests.length === 2)
          return Response.json(
            { errors: [{ extensions: { code: 'RECORD_NOT_UNIQUE' } }] },
            { status: 400 }
          );
        return Response.json({ data: {} });
      },
    });
    await Promise.all([reporter.publish(), reporter.publish()]);
    expect(requests.map((item) => item.method)).toEqual(['POST', 'POST', 'PATCH']);
    expect(new Set(requests.map((item) => item.id)).size).toBe(1);
  });
});
