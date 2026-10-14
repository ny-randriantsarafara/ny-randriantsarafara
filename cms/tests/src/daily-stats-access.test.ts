import { aggregate, createItem, deleteItem } from '@directus/sdk';
import { afterAll, describe, expect, it } from 'vitest';

import { adminClient, apiClient } from './support/clients.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const suffix = uniqueSuffix();
const eventIds: string[] = [];

afterAll(async () => {
  for (const id of eventIds) {
    await adminClient.request(deleteItem('events', id));
  }
});

describe('daily stats aggregates', () => {
  it('lets the API service count distinct visitor hashes for page views', async () => {
    const visitorHash = `hash-${suffix}`;
    for (const path of ['/a', '/b']) {
      const created = await apiClient.request(
        createItem(
          'events',
          {
            type: 'page_view',
            path,
            locale: 'en',
            visitor_hash: visitorHash,
            payload: {},
          },
          { fields: ['id'] }
        )
      );
      eventIds.push(created.id);
    }
    const result = await apiClient.request(
      aggregate('events', {
        aggregate: { countDistinct: ['visitor_hash'] },
        query: {
          filter: {
            type: { _eq: 'page_view' },
            visitor_hash: { _eq: visitorHash },
          },
        },
      })
    );
    const count = readDistinctVisitorCount(result);
    expect(count).toBe(1);
  });
});

function readDistinctVisitorCount(result: unknown): number {
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error('Expected an aggregate row.');
  }
  const row = result[0];
  if (!isRecord(row)) {
    throw new Error('Expected an aggregate object.');
  }
  const distinct = row.countDistinct;
  if (!isRecord(distinct)) {
    throw new Error('Expected a distinct visitor count.');
  }
  const raw = distinct.visitor_hash;
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    return Number.parseInt(raw, 10);
  }
  throw new Error('Expected a distinct visitor count.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
