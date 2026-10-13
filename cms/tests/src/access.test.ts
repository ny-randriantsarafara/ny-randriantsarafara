import {
  createItem,
  deleteItem,
  readFlows,
  readItems,
  readPermissions,
  readPolicies,
  readSingleton,
  readUsers,
  updateItem,
} from '@directus/sdk';
import {
  API_SERVICE_POLICY_NAME,
  ASSISTANT_POLICY_NAME,
  apiServicePolicy,
  assistantPolicy,
  grantKeys,
  OWNER_POLICY_NAME,
  ownerPolicy,
  PUBLIC_POLICY_ID,
  publicGrants,
} from '@portfolio/cms-provision/access';
import type { CollectionGrant } from '@portfolio/cms-provision/access';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  adminClient,
  anonymousClient,
  apiClient,
  assistantClient,
  ownerClient,
} from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { captureErrorCode } from './support/errors.ts';
import { capabilityValues, uniqueSuffix } from './support/fixtures.ts';

type NamedRequest = [string, () => Promise<unknown>];

const suffix = uniqueSuffix();
const ownerCapabilityId = (
  await ownerClient.request(
    createItem('capabilities', capabilityValues(`owner-${suffix}`), { fields: ['id'] })
  )
).id;
const discardedPublicationId = (
  await ownerClient.request(
    createItem(
      'publications',
      { status: 'discarded', content: {}, changes: {}, changes_overview: 'Access test' },
      { fields: ['id'] }
    )
  )
).id;

afterAll(async () => {
  await adminClient.request(deleteItem('capabilities', ownerCapabilityId));
  await adminClient.request(deleteItem('publications', discardedPublicationId));
});

const permissionRow = z.object({
  collection: z.string(),
  action: z.string(),
  fields: z.array(z.string()).nullable(),
  permissions: z.unknown(),
  validation: z.unknown(),
  presets: z.unknown(),
});

async function readPolicy(name: string): Promise<{ id: string; enforceTfa: boolean }> {
  const [policy] = await adminClient.request(
    readPolicies({ filter: { name: { _eq: name } }, fields: ['id', 'enforce_tfa'], limit: 1 })
  );
  if (policy === undefined) {
    throw new Error(`Policy "${name}" not found: run pnpm provision.`);
  }
  return { id: policy.id, enforceTfa: policy.enforce_tfa };
}

async function readStoredGrantKeys(policyId: string): Promise<string[]> {
  const rows = await adminClient.request(
    readPermissions({
      filter: { policy: { _eq: policyId } },
      fields: ['collection', 'action', 'fields', 'permissions', 'validation', 'presets'],
      limit: -1,
    })
  );
  return z
    .array(permissionRow)
    .parse(rows)
    .map((row) => `${row.collection}:${row.action}`)
    .toSorted();
}

async function capabilityExists(id: string): Promise<boolean> {
  const found = await adminClient.request(
    readItems('capabilities', { filter: { id: { _eq: id } }, fields: ['id'] })
  );
  return found.length === 1;
}

describe('anonymous visitor', () => {
  const reads: NamedRequest[] = [
    ['the profile', () => anonymousClient.request(readSingleton('profile'))],
    ['capabilities', () => anonymousClient.request(readItems('capabilities'))],
    ['experiences', () => anonymousClient.request(readItems('experiences'))],
    ['publications', () => anonymousClient.request(readItems('publications'))],
  ];

  it.each(reads)('cannot read %s', async (_name, request) => {
    expect(await captureErrorCode(request())).toBe('FORBIDDEN');
  });
});

describe('assistant', () => {
  it('creates and updates working content', async () => {
    const created = await assistantClient.request(
      createItem('capabilities', capabilityValues(`assistant-${suffix}`), { fields: ['id'] })
    );
    try {
      await assistantClient.request(
        updateItem('capabilities', created.id, { title_en: 'Updated by the assistant' })
      );
      const [stored] = await adminClient.request(
        readItems('capabilities', { filter: { id: { _eq: created.id } }, fields: ['title_en'] })
      );

      expect(stored?.title_en).toBe('Updated by the assistant');
    } finally {
      await adminClient.request(deleteItem('capabilities', created.id));
    }
  });

  it('reads publications', async () => {
    await expect(assistantClient.request(readItems('publications'))).resolves.toBeDefined();
  });

  const refusals: NamedRequest[] = [
    [
      'deleting working content',
      () => assistantClient.request(deleteItem('capabilities', ownerCapabilityId)),
    ],
    [
      'creating a publication',
      () =>
        assistantClient.request(
          createItem('publications', { status: 'prepared', content: {}, changes: {} })
        ),
    ],
    [
      'updating a publication',
      () =>
        assistantClient.request(
          updateItem('publications', discardedPublicationId, { status: 'active' })
        ),
    ],
    ['reading flows', () => assistantClient.request(readFlows())],
    ['reading permissions', () => assistantClient.request(readPermissions())],
  ];

  it.each(refusals)('is refused %s', async (_name, request) => {
    expect(await captureErrorCode(request())).toBe('FORBIDDEN');
  });

  it('leaves the owner content in place after the refused delete', async () => {
    expect(await capabilityExists(ownerCapabilityId)).toBe(true);
  });
});

describe('API service', () => {
  it('reads publications', async () => {
    await expect(apiClient.request(readItems('publications'))).resolves.toBeDefined();
  });

  const refusals: NamedRequest[] = [
    ['reading the profile singleton', () => apiClient.request(readSingleton('profile'))],
    ['reading capabilities', () => apiClient.request(readItems('capabilities'))],
    [
      'creating a publication',
      () =>
        apiClient.request(
          createItem('publications', { status: 'prepared', content: {}, changes: {} })
        ),
    ],
    [
      'updating a publication',
      () =>
        apiClient.request(updateItem('publications', discardedPublicationId, { status: 'active' })),
    ],
    ['reading flows', () => apiClient.request(readFlows())],
    ['reading users', () => apiClient.request(readUsers())],
  ];

  it.each(refusals)('is refused %s', async (_name, request) => {
    expect(await captureErrorCode(request())).toBe('FORBIDDEN');
  });
});

describe('owner', () => {
  it('creates, updates and deletes working content', async () => {
    const created = await ownerClient.request(
      createItem('capabilities', capabilityValues(`owner-crud-${suffix}`), { fields: ['id'] })
    );
    await ownerClient.request(updateItem('capabilities', created.id, { title_en: 'Renamed' }));
    await ownerClient.request(deleteItem('capabilities', created.id));

    expect(await capabilityExists(created.id)).toBe(false);
  });

  it('cannot delete a publication', async () => {
    expect(
      await captureErrorCode(
        ownerClient.request(deleteItem('publications', discardedPublicationId))
      )
    ).toBe('FORBIDDEN');
  });

  it('reads the flows that render the publication buttons', async () => {
    await expect(ownerClient.request(readFlows())).resolves.toBeDefined();
  });
});

describe('stored policies', () => {
  const managed: [string, () => Promise<string>, CollectionGrant[]][] = [
    ['Public', async () => PUBLIC_POLICY_ID, publicGrants],
    [
      OWNER_POLICY_NAME,
      async () => (await readPolicy(OWNER_POLICY_NAME)).id,
      ownerPolicy(testEnvironment.ownerEnforceTfa).grants,
    ],
    [
      ASSISTANT_POLICY_NAME,
      async () => (await readPolicy(ASSISTANT_POLICY_NAME)).id,
      assistantPolicy(testEnvironment.assistantAppAccess).grants,
    ],
    [
      API_SERVICE_POLICY_NAME,
      async () => (await readPolicy(API_SERVICE_POLICY_NAME)).id,
      apiServicePolicy().grants,
    ],
  ];

  it.each(managed)('stores exactly the %s permissions', async (_name, readId, expected) => {
    expect(await readStoredGrantKeys(await readId())).toEqual(grantKeys(expected));
  });

  it('requires two-factor authentication for the owner as configured', async () => {
    expect((await readPolicy(OWNER_POLICY_NAME)).enforceTfa).toBe(testEnvironment.ownerEnforceTfa);
  });
});
