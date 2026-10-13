import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createActivePublicationCache } from '../publications/active-publication-cache.ts';
import {
  PublicationSourceError,
  type PublicationSource,
} from '../publications/publication-source.ts';
import { createApp } from './app.ts';

function createTestApp(source: PublicationSource, hookSecret = 'hook-secret') {
  const log = vi.fn<(message: string) => void>();
  const cache = createActivePublicationCache(source);
  const app = createApp({ cache, source, hookSecret, log });
  return { app, log, cache };
}

describe('createApp', () => {
  it('returns the active publication with caching headers', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe(`"${activePublicationFixture.publicationId}"`);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    await expect(response.json()).resolves.toEqual(activePublicationFixture);
  });

  it('returns 304 when If-None-Match matches the publication id', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active', {
      headers: { 'If-None-Match': `"${activePublicationFixture.publicationId}"` },
    });

    expect(response.status).toBe(304);
    expect(response.headers.get('ETag')).toBe(`"${activePublicationFixture.publicationId}"`);
  });

  it('returns 404 when no publication is active', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('returns 503 when the source fails', async () => {
    const source: PublicationSource = {
      readActive: async () => {
        throw new PublicationSourceError('Directus unavailable');
      },
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
  });

  it('returns 200 health when Directus responds', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      directus: 'up',
      publicationId: activePublicationFixture.publicationId,
    });
  });

  it('returns 503 health when Directus is down', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => false,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/health');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: 'degraded',
      directus: 'down',
      publicationId: activePublicationFixture.publicationId,
    });
  });

  it('rejects an unauthorized hook call', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('rejects an invalid hook body', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('rejects a hook body that is not JSON', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: '{"publicationId":',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('reloads the cache on a valid hook call', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activePublicationFixture);
    const source: PublicationSource = {
      readActive,
      ping: async () => true,
    };
    const { app, log } = createTestApp(source);

    await app.request('http://localhost/content/active');
    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith(
      `Publication ${activePublicationFixture.publicationId} activated; serving ${activePublicationFixture.publicationId}`
    );
    const activeResponse = await app.request('http://localhost/content/active');
    await expect(activeResponse.json()).resolves.toEqual(activePublicationFixture);
  });

  it('returns 503 when reload fails after a hook call', async () => {
    const source: PublicationSource = {
      readActive: async () => {
        throw new PublicationSourceError('read failed');
      },
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
  });

  it('returns 404 for unknown routes', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/unknown');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });
});
