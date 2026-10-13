import { readFlows, readItem, readItems } from '@directus/sdk';
import type { PublicationStatus } from '@portfolio/cms-schema';
import { z } from 'zod';

import { adminClient } from './clients.ts';
import { testEnvironment } from './environment.ts';

export type FlowAttempt =
  | { status: 'succeeded'; publication: string }
  | { status: 'rejected'; httpStatus: number; code: string; message: string };

const successResponse = z.object({ publication: z.string() });
const errorResponse = z.object({
  errors: z.array(z.object({ message: z.string(), extensions: z.object({ code: z.string() }) })),
});

export async function readFlowId(name: string): Promise<string> {
  const flows = await adminClient.request(
    readFlows({ filter: { name: { _eq: name } }, fields: ['id'], limit: 2 })
  );
  const [flow] = flows;
  if (flow === undefined || flows.length > 1) {
    throw new Error(
      `Expected one flow named "${name}", found ${flows.length}: run pnpm provision.`
    );
  }
  return flow.id;
}

export async function triggerFlow(
  token: string,
  flowId: string,
  keys: string[]
): Promise<FlowAttempt> {
  const response = await fetch(`${testEnvironment.directusUrl}/flows/trigger/${flowId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection: 'publications', keys }),
  });
  const body: unknown = await response.json();
  if (response.ok) {
    return { status: 'succeeded', publication: successResponse.parse(body).publication };
  }
  const [error] = errorResponse.parse(body).errors;
  if (error === undefined) {
    throw new Error(`Error response without details (HTTP ${response.status}).`);
  }
  return {
    status: 'rejected',
    httpStatus: response.status,
    code: error.extensions.code,
    message: error.message,
  };
}

export async function readPublication(
  id: string
): Promise<{ status: PublicationStatus; activatedAt: string | null }> {
  const publication = await adminClient.request(
    readItem('publications', id, { fields: ['status', 'activated_at'] })
  );
  return { status: publication.status, activatedAt: publication.activated_at };
}

export async function readActivePublicationIds(): Promise<string[]> {
  const publications = await adminClient.request(
    readItems('publications', { filter: { status: { _eq: 'active' } }, fields: ['id'], limit: -1 })
  );
  return publications.map((publication) => publication.id);
}
