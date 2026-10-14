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
    const row = result[0];
    const raw = row?.countDistinct?.visitor_hash;
    if (raw === null || raw === undefined) {
      throw new Error('Expected a distinct visitor count.');
    }
    const count = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    expect(count).toBe(1);
  });
});
