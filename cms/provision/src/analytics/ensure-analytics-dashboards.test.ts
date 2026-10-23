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
    await ensureAnalyticsDashboards('http://directus.test', 'token', 'staging', log);
    await ensureAnalyticsDashboards('http://directus.test', 'token', 'staging', log);

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

  it('defaults every environment filter to the deployment environment', async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/dashboards?') || url.includes('/panels?')) {
          return jsonResponse({ data: [] });
        }
        if (typeof init?.body === 'string' && url.endsWith('/panels')) {
          bodies.push(JSON.parse(init.body));
        }
        return jsonResponse({ data: {} });
      })
    );

    await ensureAnalyticsDashboards('http://directus.test', 'token', 'prod', vi.fn());

    const defaults = bodies.flatMap((body) => environmentFilterDefault(body));
    expect(defaults).toEqual(['prod', 'prod', 'prod', 'prod', 'prod']);
  });

  it('fails when Directus refuses to update an owned panel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/dashboards?')) {
          return jsonResponse({ data: Object.values(analyticsDashboardIds).map((id) => ({ id })) });
        }
        if (url.includes('/panels?')) {
          return jsonResponse({ data: ownedPanelIds.map((id) => ({ id })) });
        }
        if (init?.method === 'PATCH' && url.includes('/panels/')) {
          return jsonResponse({ errors: [{ message: 'forbidden' }] }, 403);
        }
        return jsonResponse({ data: {} });
      })
    );

    await expect(
      ensureAnalyticsDashboards('http://directus.test', 'token', 'staging', vi.fn())
    ).rejects.toThrow('Failed to update panel');
  });
});

function environmentFilterDefault(body: unknown): string[] {
  if (body === null || typeof body !== 'object' || !('options' in body)) {
    return [];
  }
  const options = body.options;
  if (options === null || typeof options !== 'object') {
    return [];
  }
  if (!('field' in options) || options.field !== 'analytics_environment') {
    return [];
  }
  if (!('defaultValue' in options) || typeof options.defaultValue !== 'string') {
    return [];
  }
  return [options.defaultValue];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
