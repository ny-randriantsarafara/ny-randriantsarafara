import { createItem, deleteItem, readItems } from '@directus/sdk';
import { afterAll, describe, expect, it } from 'vitest';

import { adminClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { capabilityValues, uniqueSuffix } from './support/fixtures.ts';
import { callMcpTool, listMcpTools, readToolErrorCodes } from './support/mcp.ts';

const suffix = uniqueSuffix();
const token = testEnvironment.assistantToken;
const keyFigureSlug = `mcp-${suffix}`;
const ownerCapabilityId = (
  await ownerClient.request(
    createItem('capabilities', capabilityValues(`mcp-owner-${suffix}`), { fields: ['id'] })
  )
).id;

afterAll(async () => {
  await adminClient.request(deleteItem('capabilities', ownerCapabilityId));
  const created = await adminClient.request(
    readItems('key_figures', { filter: { slug: { _eq: keyFigureSlug } }, fields: ['id'] })
  );
  await Promise.all(created.map((item) => adminClient.request(deleteItem('key_figures', item.id))));
});

async function readKeyFigure(): Promise<{ id: string; value: string | null } | undefined> {
  const [found] = await adminClient.request(
    readItems('key_figures', { filter: { slug: { _eq: keyFigureSlug } }, fields: ['id', 'value'] })
  );
  return found;
}

describe('MCP for the assistant', () => {
  it('exposes the content tools and the assistant protocol', async () => {
    expect(await listMcpTools(token)).toEqual(
      expect.arrayContaining(['items', 'schema', 'system-prompt'])
    );

    const protocol = await callMcpTool(token, 'system-prompt', {});

    expect(protocol.isError).toBe(false);
    expect(protocol.text).toContain('You never publish');
  });

  it('creates then updates working content through the items tool', async () => {
    const created = await callMcpTool(token, 'items', {
      action: 'create',
      collection: 'key_figures',
      data: {
        slug: keyFigureSlug,
        value: '3',
        label_en: 'Created via MCP',
        label_fr: 'Créé via MCP',
      },
    });
    const stored = await readKeyFigure();

    expect(created.isError).toBe(false);
    expect(stored?.value).toBe('3');

    const updated = await callMcpTool(token, 'items', {
      action: 'update',
      collection: 'key_figures',
      data: [{ id: stored?.id, value: '4' }],
    });

    expect(updated.isError).toBe(false);
    expect((await readKeyFigure())?.value).toBe('4');
  });

  it('refuses a delete and leaves the item in place', async () => {
    const outcome = await callMcpTool(token, 'items', {
      action: 'delete',
      collection: 'capabilities',
      keys: [ownerCapabilityId],
    });
    const remaining = await adminClient.request(
      readItems('capabilities', { filter: { id: { _eq: ownerCapabilityId } }, fields: ['id'] })
    );

    expect(outcome.isError).toBe(true);
    expect(remaining).toHaveLength(1);
  });

  const refusals: [string, string, Record<string, unknown>, string][] = [
    [
      'creating a publication',
      'items',
      {
        action: 'create',
        collection: 'publications',
        data: { status: 'active', content: {}, changes: {} },
      },
      'FORBIDDEN',
    ],
    ['reading flows', 'flows', { action: 'read' }, 'FORBIDDEN'],
    [
      'reading permissions as items',
      'items',
      { action: 'read', collection: 'directus_permissions' },
      'INVALID_PAYLOAD',
    ],
  ];

  it.each(refusals)('refuses %s', async (_name, tool, args, code) => {
    const outcome = await callMcpTool(token, tool, args);

    expect(outcome.isError).toBe(true);
    expect(readToolErrorCodes(outcome)).toContain(code);
  });
});
