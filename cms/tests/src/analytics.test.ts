import { createItem, deleteItem } from '@directus/sdk';
import { describe, expect, it } from 'vitest';

import { analyticsDashboardIds } from '../../provision/src/analytics/dashboard-ids.ts';
import { adminClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
function extensionUrl(path: string): string {
  return `${testEnvironment.directusUrl}${path}`;
}

async function ownerFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(extensionUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${testEnvironment.ownerToken}`,
      ...(init?.headers ?? {}),
    },
  });
}

describe('portfolio analytics extension', () => {
  it('provisions the five owned dashboards', async () => {
    const response = await fetch(`${testEnvironment.directusUrl}/dashboards?limit=-1`, {
      headers: { Authorization: `Bearer ${testEnvironment.adminToken}` },
    });
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    const ids = readDashboardIds(body);
    expect(ids).toEqual(expect.arrayContaining(Object.values(analyticsDashboardIds)));
  });

  it('denies API service access to diagnostic routes', async () => {
    const response = await fetch(extensionUrl('/portfolio-analytics/summary'), {
      headers: { Authorization: `Bearer ${testEnvironment.apiToken}` },
    });
    expect(response.status).toBe(403);
  });

  it('allows assistant reads but denies assistant review writes', async () => {
    const summary = await fetch(extensionUrl('/portfolio-analytics/summary'), {
      headers: { Authorization: `Bearer ${testEnvironment.assistantToken}` },
    });
    expect(summary.status).toBe(200);

    const review = await fetch(extensionUrl('/portfolio-analytics/reviews/exchange-id'), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${testEnvironment.assistantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: ['supported'], notes: 'n/a' }),
    });
    expect(review.status).toBe(403);
  });

  it('rejects filter keys outside the allowlist', async () => {
    const response = await ownerFetch('/portfolio-analytics/summary?role=owner');
    expect(response.status).toBe(400);
  });

  it('allows owner reads and redacts review notes on write', async () => {
    const summary = await ownerFetch('/portfolio-analytics/summary');
    expect(summary.status).toBe(200);

    const exchangeId = crypto.randomUUID();
    await adminClient.request(
      createItem('chat_exchanges', {
        id: exchangeId,
        locale: 'en',
        question: '[redacted]',
        mode: 'scripted',
        outcome: 'answered',
        received_at: new Date().toISOString(),
        analytics_excluded: false,
      })
    );

    const review = await ownerFetch(`/portfolio-analytics/reviews/${exchangeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: ['supported'],
        notes: 'Confirmed with pat@example.com',
      }),
    });
    expect(review.status).toBe(200);
    const payload: unknown = await review.json();
    const notes = readReviewNotes(payload);
    expect(notes).not.toContain('pat@example.com');

    await adminClient.request(deleteItem('chat_exchanges', exchangeId));
  });

  it('preserves user-owned panels on reprovision', async () => {
    const customPanelId = crypto.randomUUID();
    await fetch(`${testEnvironment.directusUrl}/panels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testEnvironment.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: customPanelId,
        dashboard: analyticsDashboardIds.overview,
        name: 'User panel',
        type: 'metric',
        position_x: 1,
        position_y: 40,
        width: 8,
        height: 6,
        options: { collection: 'daily_stats', field: 'visitors', function: 'sum' },
      }),
    });

    const { spawnSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const portfolioRoot = fileURLToPath(new URL('../../..', import.meta.url));
    const provision = spawnSync('corepack', ['pnpm', 'provision'], {
      cwd: portfolioRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    expect(provision.status).toBe(0);

    const response = await fetch(`${testEnvironment.directusUrl}/panels/${customPanelId}`, {
      headers: { Authorization: `Bearer ${testEnvironment.adminToken}` },
    });
    expect(response.status).toBe(200);

    await fetch(`${testEnvironment.directusUrl}/panels/${customPanelId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testEnvironment.adminToken}` },
    });
  });
});

function readDashboardIds(body: unknown): string[] {
  if (body === null || typeof body !== 'object' || !('data' in body)) {
    throw new Error('Expected dashboard list response.');
  }
  const data = body.data;
  if (!Array.isArray(data)) {
    throw new Error('Expected dashboard list response.');
  }
  const ids: string[] = [];
  for (const row of data) {
    if (row === null || typeof row !== 'object' || !('id' in row)) {
      throw new Error('Expected dashboard list response.');
    }
    if (typeof row.id !== 'string') {
      throw new Error('Expected dashboard list response.');
    }
    ids.push(row.id);
  }
  return ids;
}

function readReviewNotes(body: unknown): string | null {
  if (body === null || typeof body !== 'object' || !('data' in body)) {
    throw new Error('Expected review response.');
  }
  const data = body.data;
  if (data === null || typeof data !== 'object' || !('notes' in data)) {
    throw new Error('Expected review response.');
  }
  const notes = data.notes;
  if (notes === null) {
    return null;
  }
  if (typeof notes !== 'string') {
    throw new Error('Expected review response.');
  }
  return notes;
}
