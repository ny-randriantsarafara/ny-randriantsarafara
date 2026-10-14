import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createActivePublicationCache } from '../publications/active-publication-cache.ts';
import {
  PublicationSourceError,
  type PublicationSource,
} from '../publications/publication-source.ts';
import type { SiteBuildDispatcher, SiteBuildOutcome } from '../site-build/site-build-dispatcher.ts';
import { createInternalApp } from './internal-app.ts';

const hookUrl = 'http://localhost/internal/publications/activated';

function createTestApp(
  source: PublicationSource,
  outcome: SiteBuildOutcome = { status: 'dispatched', environment: 'staging' }
) {
  const log = vi.fn<(message: string) => void>();
  const dispatch = vi.fn<SiteBuildDispatcher['dispatch']>(async () => outcome);
  const cache = createActivePublicationCache(source);
  const app = createInternalApp({ cache, hookSecret: 'hook-secret', siteBuild: { dispatch }, log });
  return { app, log, dispatch, cache };
}

function activationRequest(authorization: string, body: string): RequestInit {
  return {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body,
  };
}

const validBody = JSON.stringify({ publicationId: activePublicationFixture.publicationId });

describe('createInternalApp', () => {
  it('rejects an unauthorized hook call without dispatching', async () => {
    const source: PublicationSource = { readActive: async () => null, ping: async () => true };
    const { app, dispatch } = createTestApp(source);

    const response = await app.request(hookUrl, activationRequest('Bearer wrong', validBody));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejects an invalid hook body', async () => {
    const source: PublicationSource = { readActive: async () => null, ping: async () => true };
    const { app, dispatch } = createTestApp(source);

    const response = await app.request(
      hookUrl,
      activationRequest('Bearer hook-secret', JSON.stringify({ publicationId: 'not-a-uuid' }))
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejects a hook body that is not JSON', async () => {
    const source: PublicationSource = { readActive: async () => null, ping: async () => true };
    const { app } = createTestApp(source);

    const response = await app.request(
      hookUrl,
      activationRequest('Bearer hook-secret', '{"publicationId":')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('reloads the cache, then dispatches the site build', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activePublicationFixture);
    const source: PublicationSource = { readActive, ping: async () => true };
    const { app, log, dispatch, cache } = createTestApp(source);
    await cache.current();

    const response = await app.request(hookUrl, activationRequest('Bearer hook-secret', validBody));

    expect(response.status).toBe(204);
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      `Publication ${activePublicationFixture.publicationId} activated; serving ${activePublicationFixture.publicationId}`
    );
    expect(log).toHaveBeenCalledWith('Site build dispatched for staging');
  });

  it('answers 204 and logs when the site build dispatch fails', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app, log } = createTestApp(source, {
      status: 'failed',
      reason: 'GitHub rejected the token (HTTP 401)',
    });

    const response = await app.request(hookUrl, activationRequest('Bearer hook-secret', validBody));

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith(
      'Site build dispatch failed: GitHub rejected the token (HTTP 401)'
    );
  });

  it('returns 503 without dispatching when the reload fails', async () => {
    const source: PublicationSource = {
      readActive: async () => {
        throw new PublicationSourceError('read failed');
      },
      ping: async () => true,
    };
    const { app, dispatch } = createTestApp(source);

    const response = await app.request(hookUrl, activationRequest('Bearer hook-secret', validBody));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not serve public routes', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });
});
