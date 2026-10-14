import { createItem, deleteItem, readItem, readItems } from '@directus/sdk';
import { afterAll, describe, expect, it } from 'vitest';

import { adminClient, anonymousClient, apiClient, assistantClient } from './support/clients.ts';
import { captureErrorCode } from './support/errors.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const suffix = uniqueSuffix();
const eventIds: string[] = [];
const saltIds: string[] = [];
const alertIds: string[] = [];

afterAll(async () => {
  for (const id of alertIds) {
    await adminClient.request(deleteItem('alerts', id));
  }
  for (const id of saltIds) {
    await adminClient.request(deleteItem('visitor_salts', id));
  }
  for (const id of eventIds) {
    await adminClient.request(deleteItem('events', id));
  }
});

describe('measurement collections access', () => {
  it('lets the API service create events and manage visitor salts', async () => {
    const created = await apiClient.request(
      createItem(
        'events',
        {
          type: 'page_view',
          path: '/',
          locale: 'en',
          device_class: 'desktop',
          visitor_hash: 'abcd1234abcd1234',
        },
        { fields: ['id'] }
      )
    );
    eventIds.push(created.id);

    const day = `2099-01-${suffix.slice(-2)}`;
    const saltRow = await apiClient.request(
      createItem(
        'visitor_salts',
        {
          day,
          salt: 'a'.repeat(64),
        },
        { fields: ['id'] }
      )
    );
    saltIds.push(saltRow.id);
    await apiClient.request(deleteItem('visitor_salts', saltRow.id));
    saltIds.pop();
  });

  it('refuses event creation for the assistant and anonymous clients', async () => {
    expect(
      await captureErrorCode(
        assistantClient.request(
          createItem('events', {
            type: 'page_view',
            path: '/',
            locale: 'en',
            device_class: 'desktop',
            visitor_hash: 'abcd1234abcd1234',
          })
        )
      )
    ).toBe('FORBIDDEN');
    expect(
      await captureErrorCode(
        anonymousClient.request(
          createItem('events', {
            type: 'page_view',
            path: '/',
            locale: 'en',
            device_class: 'desktop',
            visitor_hash: 'abcd1234abcd1234',
          })
        )
      )
    ).toBe('FORBIDDEN');
  });

  it('lets the assistant read events but not delete anything', async () => {
    await expect(assistantClient.request(readItems('events', { limit: 1 }))).resolves.toBeDefined();
    expect(
      await captureErrorCode(assistantClient.request(deleteItem('events', eventIds[0] ?? '')))
    ).toBe('FORBIDDEN');
  });

  it('refuses API contact message reads until field-scoped retention lands in plan 5b', async () => {
    expect(
      await captureErrorCode(apiClient.request(readItems('contact_messages', { limit: 1 })))
    ).toBe('FORBIDDEN');
  });

  it('refuses assistant reads on alerts', async () => {
    const dedupKey = `alert-${suffix}`;
    const created = await adminClient.request(
      createItem(
        'alerts',
        { kind: 'test', dedup_key: dedupKey, details: { ok: true } },
        { fields: ['id'] }
      )
    );
    alertIds.push(created.id);
    expect(await captureErrorCode(assistantClient.request(readItems('alerts', { limit: 1 })))).toBe(
      'FORBIDDEN'
    );
    await expect(apiClient.request(readItem('alerts', created.id))).resolves.toBeDefined();
  });
});
