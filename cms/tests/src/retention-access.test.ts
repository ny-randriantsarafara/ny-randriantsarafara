import { createItem, deleteItem, readFlows, readOperations } from '@directus/sdk';
import { describe, expect, it } from 'vitest';

import { CONTACT_RETENTION_FLOW_NAME } from '../../provision/src/flows/ensure-retention-flows.ts';
import { adminClient, apiClient } from './support/clients.ts';
import { captureErrorCode } from './support/errors.ts';
import { uniqueSuffix } from './support/fixtures.ts';

const suffix = uniqueSuffix();

function readFirstOperation(result: unknown): { type: string; options: unknown } {
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error('Expected a retention operation.');
  }
  const row = result[0];
  if (!isRecord(row) || typeof row.type !== 'string') {
    throw new Error('Expected a retention operation type.');
  }
  return { type: row.type, options: row.options };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('retention access and flow', () => {
  it('lets the API service delete old events but not contact messages', async () => {
    const created = await apiClient.request(
      createItem(
        'events',
        {
          type: 'page_view',
          path: `/retention-${suffix}`,
          locale: 'en',
          visitor_hash: 'abcd1234abcd1234',
          payload: {},
        },
        { fields: ['id'] }
      )
    );
    await expect(apiClient.request(deleteItem('events', created.id))).resolves.toBeDefined();
    expect(
      await captureErrorCode(
        apiClient.request(deleteItem('contact_messages', '00000000-0000-4000-8000-000000000001'))
      )
    ).toBe('FORBIDDEN');
  });

  it('provisions the contact retention flow with the expected schedule and filter', async () => {
    const [flow] = await adminClient.request(
      readFlows({
        filter: { name: { _eq: CONTACT_RETENTION_FLOW_NAME } },
        fields: ['id', 'trigger', 'options'],
        limit: 1,
      })
    );
    expect(flow?.trigger).toBe('schedule');
    expect(flow?.options).toEqual({ cron: '5 3 * * *' });
    const operations = await adminClient.request(
      readOperations({
        filter: { flow: { _eq: flow?.id } },
        fields: ['type', 'options'],
        limit: 1,
      })
    );
    const operation = readFirstOperation(operations);
    expect(operation.type).toBe('item-delete');
    expect(operation.options).toMatchObject({
      collection: 'contact_messages',
      query: {
        filter: {
          date_updated: {
            _lt: '$NOW(-3 years)',
          },
        },
      },
    });
  });
});
