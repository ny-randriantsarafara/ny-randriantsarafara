import { aggregate, createItem, deleteItem, readItems, updateItem } from '@directus/sdk';
import { afterAll, describe, expect, it } from 'vitest';

import {
  adminClient,
  anonymousClient,
  apiClient,
  assistantClient,
  ownerClient,
} from './support/clients.ts';
import { captureErrorCode } from './support/errors.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const suffix = uniqueSuffix();
const exchangeIds: string[] = [];
const contactIds: string[] = [];

afterAll(async () => {
  for (const id of contactIds) {
    await adminClient.request(deleteItem('contact_messages', id));
  }
  for (const id of exchangeIds) {
    await adminClient.request(deleteItem('chat_exchanges', id));
  }
});

describe('operational collections access', () => {
  it('lets the API service create chat exchanges and contact messages', async () => {
    const exchange = await apiClient.request(
      createItem(
        'chat_exchanges',
        {
          locale: 'en',
          conversation_id: `conv-${suffix}`,
          question: 'Test question',
          mode: 'scripted',
          outcome: 'unknown',
          answer_slugs: [],
          blocks: [],
          latency_ms: 12,
          cost_eur: 0.0025,
          publication_id: '00000000-0000-4000-8000-000000000001',
        },
        { fields: ['id'] }
      )
    );
    exchangeIds.push(exchange.id);

    const contact = await apiClient.request(
      createItem(
        'contact_messages',
        {
          name: 'Visitor',
          email: 'visitor@example.com',
          message: 'Hello',
          locale: 'en',
          status: 'new',
        },
        { fields: ['id'] }
      )
    );
    contactIds.push(contact.id);
  });

  it('lets the API service sum chat exchange cost', async () => {
    const result = await apiClient.request(
      aggregate('chat_exchanges', {
        aggregate: { sum: ['cost_eur'] },
        query: { filter: { conversation_id: { _eq: `conv-${suffix}` } } },
      })
    );
    const row = result[0];
    if (row === undefined || typeof row.sum?.cost_eur !== 'string') {
      throw new Error('Expected a numeric sum from the aggregate query.');
    }
    expect(Number.parseFloat(row.sum.cost_eur)).toBeCloseTo(0.0025, 5);
  });

  it('refuses contact message reads for the API service and the assistant', async () => {
    expect(
      await captureErrorCode(apiClient.request(readItems('contact_messages', { limit: 1 })))
    ).toBe('FORBIDDEN');
    expect(
      await captureErrorCode(assistantClient.request(readItems('contact_messages', { limit: 1 })))
    ).toBe('FORBIDDEN');
  });

  it('lets the assistant read chat exchanges', async () => {
    await expect(
      assistantClient.request(readItems('chat_exchanges', { limit: 1 }))
    ).resolves.toBeDefined();
  });

  it('refuses anonymous reads on operational collections', async () => {
    expect(
      await captureErrorCode(anonymousClient.request(readItems('chat_exchanges', { limit: 1 })))
    ).toBe('FORBIDDEN');
    expect(
      await captureErrorCode(anonymousClient.request(readItems('contact_messages', { limit: 1 })))
    ).toBe('FORBIDDEN');
  });

  it('lets the owner update contact message status', async () => {
    const created = await apiClient.request(
      createItem(
        'contact_messages',
        {
          name: 'Owner test',
          email: 'owner-test@example.com',
          message: 'Status update',
          locale: 'en',
          status: 'new',
        },
        { fields: ['id', 'status'] }
      )
    );
    contactIds.push(created.id);

    await ownerClient.request(updateItem('contact_messages', created.id, { status: 'handled' }));
    const [stored] = await adminClient.request(
      readItems('contact_messages', {
        filter: { id: { _eq: created.id } },
        fields: ['status'],
        limit: 1,
      })
    );
    expect(stored?.status).toBe('handled');
  });
});
