import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import type { ChatService } from '../chat/chat-service.ts';
import type { ContactService } from '../contact/contact-service.ts';
import { createActivePublicationCache } from '../publications/active-publication-cache.ts';
import {
  PublicationSourceError,
  type PublicationSource,
} from '../publications/publication-source.ts';
import { createVisitorKeyFactoryWithSalt } from '../visitor/visitor-key.ts';
import { createPublicApp } from './public-app.ts';

const visitorSalt = Buffer.from('01234567890123456789012345678901');

function createTestApp(source: PublicationSource) {
  const log = vi.fn<(message: string) => void>();
  const cache = createActivePublicationCache(source);
  const chatService: ChatService = {
    handle: async () => ({
      status: 200,
      body: {
        mode: 'scripted',
        publicationId: activePublicationFixture.publicationId,
        reply: {
          text: 'Hello',
          answerSlugs: [],
          blocks: [],
          suggestions: ['A?', 'B?'],
          outcome: 'unknown',
        },
      },
    }),
  };
  const contactService: ContactService = {
    handle: async () => ({ status: 200, body: { status: 'accepted' } }),
  };
  const app = createPublicApp({
    cache,
    source,
    log,
    corsAllowedOrigins: ['https://example.com'],
    chatService,
    contactService,
    visitorKeys: createVisitorKeyFactoryWithSalt(visitorSalt),
  });
  return { app, log };
}

describe('createPublicApp', () => {
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
    const { app, log } = createTestApp(source);

    const response = await app.request('http://localhost/content/active');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
    expect(log).toHaveBeenCalledWith('Active publication unavailable: Directus unavailable');
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

  it('does not serve the publication hook', async () => {
    const source: PublicationSource = {
      readActive: async () => null,
      ping: async () => true,
    };
    const { app } = createTestApp(source);

    const response = await app.request('http://localhost/internal/publications/activated', {
      method: 'POST',
      headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicationId: activePublicationFixture.publicationId }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('returns 503 when the chat service throws', async () => {
    const source: PublicationSource = {
      readActive: async () => activePublicationFixture,
      ping: async () => true,
    };
    const log = vi.fn<(message: string) => void>();
    const cache = createActivePublicationCache(source);
    const app = createPublicApp({
      cache,
      source,
      log,
      corsAllowedOrigins: ['https://example.com'],
      chatService: {
        handle: async () => {
          throw new Error('boom');
        },
      },
      contactService: {
        handle: async () => ({ status: 200, body: { status: 'accepted' } }),
      },
      visitorKeys: createVisitorKeyFactoryWithSalt(visitorSalt),
    });

    const response = await app.request('http://localhost/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
    expect(log).toHaveBeenCalledWith('Chat request failed: boom');
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
