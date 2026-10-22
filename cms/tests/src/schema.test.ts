import { createItem, deleteItem, readCollections } from '@directus/sdk';
import { describe, expect, it } from 'vitest';

import { adminClient } from './support/clients.ts';
import { captureErrorCode } from './support/errors.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const expectedCollections = [
  'profile',
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'key_figures',
  'answers',
  'chat_settings',
  'site_settings',
  'model_settings',
  'publications',
  'chat_exchanges',
  'chat_reviews',
  'model_generations',
  'analytics_status',
  'contact_messages',
  'events',
  'visitor_salts',
  'search_console_rows',
  'daily_stats',
  'alerts',
];

describe('provisioned schema', () => {
  it('creates every portfolio collection', async () => {
    const collections = await adminClient.request(readCollections());

    expect(collections.map((collection) => collection.collection)).toEqual(
      expect.arrayContaining(expectedCollections)
    );
  });

  it('rejects a duplicate visitor_salts day', async () => {
    const day = `2099-02-${uniqueSuffix().slice(-2)}`;
    const created = await adminClient.request(
      createItem('visitor_salts', { day, salt: 'b'.repeat(64) }, { fields: ['id'] })
    );
    try {
      const duplicate = adminClient.request(
        createItem('visitor_salts', { day, salt: 'c'.repeat(64) })
      );
      expect(await captureErrorCode(duplicate)).toBe('RECORD_NOT_UNIQUE');
    } finally {
      await adminClient.request(deleteItem('visitor_salts', created.id));
    }
  });

  it('rejects a duplicate alerts dedup_key', async () => {
    const dedupKey = `dedup-${uniqueSuffix()}`;
    const created = await adminClient.request(
      createItem(
        'alerts',
        { kind: 'test', dedup_key: dedupKey, details: { ok: true } },
        { fields: ['id'] }
      )
    );
    try {
      const duplicate = adminClient.request(
        createItem('alerts', { kind: 'test', dedup_key: dedupKey, details: { retry: true } })
      );
      expect(await captureErrorCode(duplicate)).toBe('RECORD_NOT_UNIQUE');
    } finally {
      await adminClient.request(deleteItem('alerts', created.id));
    }
  });

  it('rejects a second item with the same slug', async () => {
    const slug = `schema-${uniqueSuffix()}`;
    const created = await adminClient.request(
      createItem('key_figures', { slug, value: '1' }, { fields: ['id'] })
    );
    try {
      const duplicate = adminClient.request(createItem('key_figures', { slug, value: '2' }));

      expect(await captureErrorCode(duplicate)).toBe('RECORD_NOT_UNIQUE');
    } finally {
      await adminClient.request(deleteItem('key_figures', created.id));
    }
  });
});
