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

async function readLatestContactId(email: string): Promise<string> {
  const rows = await adminClient.request(
    readItems('contact_messages', {
      filter: { email: { _eq: email } },
      fields: ['id'],
      sort: ['-date_created'],
      limit: 1,
    })
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`Contact message for ${email} was not stored.`);
  }
  return row.id;
}

describe('operational collections access', () => {
  it('lets the API service create chat exchanges and contact messages', async () => {
    await apiClient.request(
      createItem('chat_exchanges', {
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
      })
    );
    const exchanges = await adminClient.request(
      readItems('chat_exchanges', {
        filter: { conversation_id: { _eq: `conv-${suffix}` } },
        fields: ['id'],
        limit: 1,
      })
    );
    const exchange = exchanges[0];
    if (exchange === undefined) {
      throw new Error('Chat exchange was not stored.');
    }
    exchangeIds.push(exchange.id);

    const contactEmail = `visitor-${suffix}@example.com`;
    await apiClient.request(
      createItem('contact_messages', {
        name: 'Visitor',
        email: contactEmail,
        message: 'Hello',
        locale: 'en',
        status: 'new',
      })
    );
    contactIds.push(await readLatestContactId(contactEmail));
  });

  it('lets the API service sum chat exchange cost', async () => {
    const result = await apiClient.request(
      aggregate('chat_exchanges', {
        aggregate: { sum: ['cost_eur'] },
        query: { filter: { conversation_id: { _eq: `conv-${suffix}` } } },
      })
    );
    const row = result[0];
    const raw = row?.sum?.cost_eur;
    if (raw === null || raw === undefined) {
      throw new Error('Expected a numeric sum from the aggregate query.');
    }
    const sumEur = typeof raw === 'number' ? raw : Number.parseFloat(raw);
    expect(sumEur).toBeCloseTo(0.0025, 5);
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
    const contactEmail = `owner-test-${suffix}@example.com`;
    await apiClient.request(
      createItem('contact_messages', {
        name: 'Owner test',
        email: contactEmail,
        message: 'Status update',
        locale: 'en',
        status: 'new',
      })
    );
    const createdId = await readLatestContactId(contactEmail);
    contactIds.push(createdId);

    await ownerClient.request(updateItem('contact_messages', createdId, { status: 'handled' }));
    const [stored] = await adminClient.request(
      readItems('contact_messages', {
        filter: { id: { _eq: createdId } },
        fields: ['status'],
        limit: 1,
      })
    );
    expect(stored?.status).toBe('handled');
  });
});
