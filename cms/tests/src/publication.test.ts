import { randomUUID } from 'node:crypto';

import { createItem, deleteItem, readSingleton, updateItem, updateSingleton } from '@directus/sdk';
import { PREPARE_FLOW_NAME, PUBLISH_FLOW_NAME } from '@portfolio/cms-schema/operations';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { adminClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { uniqueSuffix } from './support/fixtures.ts';
import { startHookServer } from './support/hook-server.ts';
import type { HookResponder } from './support/hook-server.ts';
import { callMcpTool, readToolErrorCodes } from './support/mcp.ts';
import {
  readActivePublicationIds,
  readFlowId,
  readPublication,
  triggerFlow,
} from './support/publication.ts';

const suffix = uniqueSuffix();
const ownerToken = testEnvironment.ownerToken;
const prepareFlowId = await readFlowId(PREPARE_FLOW_NAME);
const publishFlowId = await readFlowId(PUBLISH_FLOW_NAME);
const hookResponder = vi.fn<HookResponder>(() => 204);
const hookServer = await startHookServer(testEnvironment.hookUrl, hookResponder);
const originalSettings = await adminClient.request(
  readSingleton('site_settings', { fields: ['description_en'] })
);

afterAll(async () => {
  await adminClient.request(
    updateSingleton('site_settings', { description_en: originalSettings.description_en })
  );
  await hookServer.close();
});

async function changeContent(label: string): Promise<void> {
  await ownerClient.request(
    updateSingleton('site_settings', { description_en: `${label} (${suffix})` })
  );
}

async function prepare(): Promise<string> {
  const attempt = await triggerFlow(ownerToken, prepareFlowId, []);
  if (attempt.status === 'rejected') {
    throw new Error(`Prepare was refused: ${attempt.code} ${attempt.message}`);
  }
  return attempt.publication;
}

async function publish(publicationId: string): Promise<void> {
  const attempt = await triggerFlow(ownerToken, publishFlowId, [publicationId]);
  if (attempt.status === 'rejected') {
    throw new Error(`Publish was refused: ${attempt.code} ${attempt.message}`);
  }
}

describe('publication', () => {
  it('discards an earlier prepared publication and publishes the latest one', async () => {
    await changeContent('First draft');
    const earlier = await prepare();
    await changeContent('Second draft');
    const latest = await prepare();

    expect((await readPublication(earlier)).status).toBe('discarded');
    expect(await triggerFlow(ownerToken, publishFlowId, [earlier])).toMatchObject({
      status: 'rejected',
      httpStatus: 409,
      code: 'PUBLICATION_STATE',
    });

    await publish(latest);

    expect(await readActivePublicationIds()).toEqual([latest]);
    expect(hookResponder).toHaveBeenLastCalledWith({
      authorization: `Bearer ${testEnvironment.hookSecret}`,
      body: { publicationId: latest },
    });
  });

  it('refuses to prepare when nothing changed since the active publication', async () => {
    await changeContent('Unchanged');
    await publish(await prepare());

    expect(await triggerFlow(ownerToken, prepareFlowId, [])).toMatchObject({
      status: 'rejected',
      httpStatus: 400,
      code: 'NOTHING_TO_PUBLISH',
    });
  });

  it('only notifies the API again when the active publication is published again', async () => {
    await changeContent('Notified again');
    const publicationId = await prepare();
    await publish(publicationId);
    const activated = await readPublication(publicationId);
    const callCount = hookResponder.mock.calls.length;

    await publish(publicationId);

    expect(await readPublication(publicationId)).toEqual(activated);
    expect(hookResponder).toHaveBeenCalledTimes(callCount + 1);
  });

  it('refuses a missing French text and names the item and field', async () => {
    const slug = `integration-${suffix}`;
    const created = await ownerClient.request(
      createItem(
        'experiences',
        {
          slug,
          company: 'Integration',
          role_en: 'Tester',
          role_fr: 'Testeur',
          start_month: '2026-01',
          summary_en: 'Created by an integration test.',
          summary_fr: 'Créée par un test d’intégration.',
          highlights_en: 'Checked.',
          highlights_fr: 'Vérifié.',
          skill_slugs: [],
        },
        { fields: ['id'] }
      )
    );
    try {
      await ownerClient.request(updateItem('experiences', created.id, { summary_fr: null }));

      const attempt = await triggerFlow(ownerToken, prepareFlowId, []);

      expect(attempt).toMatchObject({
        status: 'rejected',
        httpStatus: 400,
        code: 'PUBLICATION_INVALID',
        message: expect.stringContaining(`experiences[${slug}].summary.fr`),
      });
    } finally {
      await ownerClient.request(deleteItem('experiences', created.id));
    }
  });

  it('keeps a publication active when the API hook fails, and a retry only notifies', async () => {
    await changeContent('Hook failure');
    const publicationId = await prepare();
    hookResponder.mockReturnValueOnce(500);

    const attempt = await triggerFlow(ownerToken, publishFlowId, [publicationId]);

    expect(attempt).toMatchObject({
      status: 'rejected',
      httpStatus: 502,
      code: 'PUBLICATION_HOOK_FAILED',
      message: expect.stringContaining('Run Publish on it again'),
    });
    expect((await readPublication(publicationId)).status).toBe('active');

    const callCount = hookResponder.mock.calls.length;
    await publish(publicationId);

    expect(await readActivePublicationIds()).toEqual([publicationId]);
    expect(hookResponder).toHaveBeenCalledTimes(callCount + 1);
  });

  it('rolls back by publishing a superseded publication', async () => {
    await changeContent('Before the rollback');
    const previous = await prepare();
    await publish(previous);
    await changeContent('After the rollback');
    const latest = await prepare();
    await publish(latest);

    expect((await readPublication(previous)).status).toBe('superseded');

    await publish(previous);

    expect(await readActivePublicationIds()).toEqual([previous]);
    expect((await readPublication(latest)).status).toBe('superseded');
  });

  it('refuses Prepare and Publish to the assistant', async () => {
    const assistantToken = testEnvironment.assistantToken;

    expect(await triggerFlow(assistantToken, prepareFlowId, [])).toMatchObject({
      status: 'rejected',
      code: 'FORBIDDEN',
    });
    expect(await triggerFlow(assistantToken, publishFlowId, [randomUUID()])).toMatchObject({
      status: 'rejected',
      code: 'FORBIDDEN',
    });
  });

  it('refuses the MCP flow trigger to the assistant', async () => {
    const outcome = await callMcpTool(testEnvironment.assistantToken, 'trigger-flow', {
      id: prepareFlowId,
      collection: 'publications',
      keys: [],
    });

    expect(outcome.isError).toBe(true);
    expect(readToolErrorCodes(outcome)).toContain('FORBIDDEN');
  });
});
