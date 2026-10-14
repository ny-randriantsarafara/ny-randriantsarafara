import { readSingleton, updateSingleton } from '@directus/sdk';
import { createInternalApp, createPublicApp } from '@portfolio/api/http';
import {
  createActivePublicationCache,
  createDirectusPublicationSource,
} from '@portfolio/api/publications';
import { PREPARE_FLOW_NAME, PUBLISH_FLOW_NAME } from '@portfolio/cms-schema/operations';
import { validatePublicationContent } from '@portfolio/content';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { adminClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { uniqueSuffix } from './support/fixtures.ts';
import { startHookServer } from './support/hook-server.ts';
import type { HookResponder } from './support/hook-server.ts';
import { readActivePublicationIds, readFlowId, triggerFlow } from './support/publication.ts';

const suffix = uniqueSuffix();
const ownerToken = testEnvironment.ownerToken;
const prepareFlowId = await readFlowId(PREPARE_FLOW_NAME);
const publishFlowId = await readFlowId(PUBLISH_FLOW_NAME);
const hookResponder = vi.fn<HookResponder>(() => 204);
const hookServer = await startHookServer(testEnvironment.hookUrl, hookResponder);
const source = createDirectusPublicationSource(
  testEnvironment.directusUrl,
  testEnvironment.apiToken
);
const cache = createActivePublicationCache(source);
const chatService = {
  handle: async () => ({ status: 503, body: { error: 'unavailable' } }),
};
const publicApp = createPublicApp({
  cache,
  source,
  log: () => undefined,
  corsAllowedOrigins: ['http://localhost:3000'],
  chatService,
  contactService: {
    handle: async () => ({ status: 200, body: { status: 'accepted' } }),
  },
  visitorKeys: { derive: () => 'integration-test-visitor' },
});
const internalApp = createInternalApp({
  cache,
  hookSecret: testEnvironment.hookSecret,
  siteBuild: { dispatch: async () => ({ status: 'skipped', reason: 'integration test' }) },
  log: () => undefined,
});
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

describe('content API against Directus', () => {
  it('serves the active publication after Prepare and Publish', async () => {
    await changeContent('Content API');
    const publicationId = await prepare();
    await publish(publicationId);

    const response = await publicApp.request('http://test/content/active');
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ publicationId });
    const content =
      typeof body === 'object' && body !== null && 'content' in body ? body.content : undefined;
    expect(validatePublicationContent(content).valid).toBe(true);
    expect(await readActivePublicationIds()).toEqual([publicationId]);
  });

  it('authorizes the activation hook and keeps serving the active publication', async () => {
    const unauthorized = await internalApp.request('http://test/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42' }),
    });
    expect(unauthorized.status).toBe(401);

    const activeIds = await readActivePublicationIds();
    const [activeId] = activeIds;
    if (activeId === undefined) {
      throw new Error('Expected an active publication from earlier tests.');
    }

    const authorized = await internalApp.request('http://test/internal/publications/activated', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testEnvironment.hookSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicationId: activeId }),
    });
    expect(authorized.status).toBe(204);

    const activeResponse = await publicApp.request('http://test/content/active');
    await expect(activeResponse.json()).resolves.toMatchObject({ publicationId: activeId });
  });

  it('reports Directus as up on health', async () => {
    const response = await publicApp.request('http://test/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', directus: 'up' });
  });
});
