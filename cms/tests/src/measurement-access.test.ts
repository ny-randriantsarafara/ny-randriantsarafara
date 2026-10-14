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
    const payload = {
      type: 'page_view',
      path: '/',
      locale: 'en',
      device_class: 'desktop',
      visitor_hash: 'abcd1234abcd1234',
    };
    expect(await captureErrorCode(assistantClient.request(createItem('events', payload)))).toBe(
      'FORBIDDEN'
    );
    expect(await captureErrorCode(anonymousClient.request(createItem('events', payload)))).toBe(
      'FORBIDDEN'
    );
  });

  it('lets the assistant read events but not delete anything', async () => {
    await expect(assistantClient.request(readItems('events', { limit: 1 }))).resolves.toBeDefined();
    expect(
      await captureErrorCode(assistantClient.request(deleteItem('events', eventIds[0] ?? '')))
    ).toBe('FORBIDDEN');
  });

  it('scopes API contact reads to retention fields only', async () => {
    const email = `retention-${suffix}@example.com`;
    await apiClient.request(
      createItem('contact_messages', {
        name: 'Retention',
        email,
        message: 'Secret body',
        locale: 'en',
        status: 'new',
      })
    );
    const rows = await apiClient.request(
      readItems('contact_messages', {
        filter: { email: { _eq: email } },
        fields: ['id', 'date_created', 'status', 'message'],
        limit: 1,
      })
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error('Contact message was not stored.');
    }
    expect(row.id).toBeTruthy();
    expect(row.status).toBe('new');
    expect('message' in row).toBe(false);
    await adminClient.request(deleteItem('contact_messages', row.id));
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
