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
  'publications',
  'chat_exchanges',
  'contact_messages',
];

describe('provisioned schema', () => {
  it('creates every portfolio collection', async () => {
    const collections = await adminClient.request(readCollections());

    expect(collections.map((collection) => collection.collection)).toEqual(
      expect.arrayContaining(expectedCollections)
    );
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
