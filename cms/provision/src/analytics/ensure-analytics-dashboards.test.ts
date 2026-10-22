import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyticsDashboardIds, ownedPanelIds } from './dashboard-ids.ts';
import { ensureAnalyticsDashboards } from './ensure-analytics-dashboards.ts';

describe('ensureAnalyticsDashboards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates owned dashboards and panels without deleting user-created panels', async () => {
    const userPanelId = 'f0000000-0000-4000-8000-000000000099';
    const calls: { method: string; url: string }[] = [];
    const dashboardIds = new Set(Object.values(analyticsDashboardIds));
    const panelIds = new Set<string>([...ownedPanelIds, userPanelId]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        const method = init?.method ?? 'GET';
        calls.push({ method, url });

        if (url.includes('/dashboards?')) {
          return jsonResponse({ data: [...dashboardIds].map((id) => ({ id })) });
        }
        if (url.includes('/panels?')) {
          return jsonResponse({ data: [...panelIds].map((id) => ({ id })) });
        }
        if (method === 'PATCH' || method === 'POST') {
          return jsonResponse({ data: {} });
        }
        return jsonResponse({ data: {} });
      })
    );

    const log = vi.fn();
    await ensureAnalyticsDashboards('http://directus.test', 'token', log);
    await ensureAnalyticsDashboards('http://directus.test', 'token', log);

    const deletedPanels = calls.filter(
      (call) => call.method === 'DELETE' && call.url.includes('/panels/')
    );
    expect(deletedPanels).toEqual([]);

    const patchedUserPanel = calls.some(
      (call) => call.method === 'PATCH' && call.url.includes(userPanelId)
    );
    expect(patchedUserPanel).toBe(false);

    const patchedOwnedPanel = calls.some(
      (call) =>
        call.method === 'PATCH' && ownedPanelIds.some((ownedId) => call.url.includes(ownedId))
    );
    expect(patchedOwnedPanel).toBe(true);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
