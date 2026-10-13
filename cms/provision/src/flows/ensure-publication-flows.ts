import {
  createFlow,
  createOperation,
  readFlows,
  readOperations,
  updateFlow,
  updateOperation,
} from '@directus/sdk';
import {
  ACTIVATE_OPERATION,
  PREPARE_FLOW_NAME,
  PREPARE_OPERATION,
  PUBLISH_FLOW_NAME,
} from '@portfolio/cms-schema/operations';

import type { AdminClient, Log } from '../directus-client.ts';
import { operationFieldsDiffer } from './flow-operation.ts';
import type { OperationFields } from './flow-operation.ts';

type ManualFlow = {
  name: string;
  icon: string;
  color: string;
  description: string;
  status: string;
  trigger: string;
  accountability: string;
  options: Record<string, string | boolean | string[]>;
};

type PublicationFlow = { flow: ManualFlow; operationKey: string; operation: OperationFields };

const publicationFlows: PublicationFlow[] = [
  {
    flow: {
      name: PREPARE_FLOW_NAME,
      icon: 'fact_check',
      color: '#2F6F4E',
      description:
        'Validates the working content and stores it as a prepared publication with its changes.',
      status: 'active',
      trigger: 'manual',
      accountability: 'all',
      options: {
        collections: ['publications'],
        location: 'collection',
        requireSelection: false,
        requireConfirmation: false,
        async: false,
        error_on_reject: true,
      },
    },
    operationKey: 'prepare',
    operation: {
      type: PREPARE_OPERATION,
      name: 'Prepare publication',
      position_x: 19,
      position_y: 1,
      options: {},
    },
  },
  {
    flow: {
      name: PUBLISH_FLOW_NAME,
      icon: 'publish',
      color: '#7A3D32',
      description:
        'Makes the selected publication the one visitors see. On a superseded publication, rolls back to it.',
      status: 'active',
      trigger: 'manual',
      accountability: 'all',
      options: {
        collections: ['publications'],
        location: 'item',
        requireSelection: true,
        requireConfirmation: true,
        confirmationDescription: 'Visitors will see this publication once the site is rebuilt.',
        async: false,
        error_on_reject: true,
      },
    },
    operationKey: 'activate',
    operation: {
      type: ACTIVATE_OPERATION,
      name: 'Activate publication',
      position_x: 19,
      position_y: 1,
      options: {},
    },
  },
];

export async function ensurePublicationFlows(client: AdminClient, log: Log): Promise<void> {
  for (const definition of publicationFlows) {
    const flowId = await ensureFlow(client, definition.flow, log);
    await ensureOperation(client, flowId, definition, log);
  }
}

async function ensureFlow(client: AdminClient, flow: ManualFlow, log: Log): Promise<string> {
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
  definition: PublicationFlow,
  log: Log
): Promise<void> {
  const [existing] = await client.request(
    readOperations({
      filter: { flow: { _eq: flowId }, key: { _eq: definition.operationKey } },
      fields: ['id', 'type', 'name', 'position_x', 'position_y', 'options'],
      limit: 1,
    })
  );
  const operation = { flow: flowId, key: definition.operationKey, ...definition.operation };
  if (existing === undefined) {
    const created = await client.request(createOperation(operation, { fields: ['id'] }));
    await client.request(updateFlow(flowId, { operation: created.id }));
    log(`Operation created: ${definition.operation.name}`);
    return;
  }
  if (operationFieldsDiffer(storedOperationFields(existing), definition.operation)) {
    await client.request(updateOperation(existing.id, operation));
    log(`Operation updated: ${definition.operation.name}`);
  }
  await client.request(updateFlow(flowId, { operation: existing.id }));
}

function storedOperationFields(operation: {
  type: string;
  name: string | null;
  position_x: number;
  position_y: number;
  options: OperationFields['options'];
}): OperationFields {
  return {
    type: operation.type,
    name: operation.name ?? '',
    position_x: operation.position_x,
    position_y: operation.position_y,
    options: operation.options,
  };
}
