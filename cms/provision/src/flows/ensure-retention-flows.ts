import {
  createFlow,
  createOperation,
  readFlows,
  readOperations,
  updateFlow,
  updateOperation,
} from '@directus/sdk';

import type { AdminClient, Log } from '../directus-client.ts';
import { operationFieldsDiffer } from './flow-operation.ts';
import type { OperationFields } from './flow-operation.ts';

export const CONTACT_RETENTION_FLOW_NAME = 'Purge old contact messages';

type ScheduledFlow = {
  name: string;
  icon: string;
  color: string;
  description: string;
  status: string;
  trigger: string;
  accountability: string;
  options: Record<string, string | boolean>;
};

type RetentionFlow = { flow: ScheduledFlow; operationKey: string; operation: OperationFields };

// Directus schedule triggers use UTC cron expressions (server timezone).
const retentionFlows: RetentionFlow[] = [
  {
    flow: {
      name: CONTACT_RETENTION_FLOW_NAME,
      icon: 'delete_sweep',
      color: '#5A4D7A',
      description:
        'Deletes contact messages three years after their last update. Runs with full access.',
      status: 'active',
      trigger: 'schedule',
      accountability: 'all',
      options: {
        cron: '5 3 * * *',
      },
    },
    operationKey: 'purge-contact',
    operation: {
      type: 'item-delete',
      name: 'Delete expired contact messages',
      position_x: 19,
      position_y: 1,
      options: {
        collection: 'contact_messages',
        query: {
          filter: {
            date_updated: {
              _lt: '$NOW(-3 years)',
            },
          },
        },
      },
    },
  },
];

export async function ensureRetentionFlows(client: AdminClient, log: Log): Promise<void> {
  for (const definition of retentionFlows) {
    const flowId = await ensureFlow(client, definition.flow, log);
    await ensureOperation(client, flowId, definition, log);
  }
}

async function ensureFlow(client: AdminClient, flow: ScheduledFlow, log: Log): Promise<string> {
  const [existing] = await client.request(
    readFlows({ filter: { name: { _eq: flow.name } }, fields: ['id'], limit: 1 })
  );
  if (existing === undefined) {
    const created = await client.request(createFlow(flow, { fields: ['id'] }));
    log(`Flow created: ${flow.name}`);
    return created.id;
  }
  await client.request(updateFlow(existing.id, flow));
  return existing.id;
}

async function ensureOperation(
  client: AdminClient,
  flowId: string,
  definition: RetentionFlow,
  log: Log
): Promise<void> {
  const [existing] = await client.request(
    readOperations({
      filter: { flow: { _eq: flowId }, key: { _eq: definition.operationKey } },
      limit: 1,
    })
  );
  if (existing === undefined) {
    await client.request(
      createOperation({
        flow: flowId,
        key: definition.operationKey,
        ...definition.operation,
      })
    );
    log(`Operation created: ${definition.operation.name}`);
    return;
  }
  const current: OperationFields = {
    type: existing.type,
    name: existing.name ?? definition.operation.name,
    position_x: existing.position_x ?? definition.operation.position_x,
    position_y: existing.position_y ?? definition.operation.position_y,
    options: existing.options ?? null,
  };
  if (operationFieldsDiffer(current, definition.operation)) {
    await client.request(updateOperation(existing.id, definition.operation));
    log(`Operation updated: ${definition.operation.name}`);
  }
}
