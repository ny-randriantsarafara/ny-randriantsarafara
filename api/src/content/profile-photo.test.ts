import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createDirectusAssetFetcher, respondWithProfilePhoto } from './profile-photo.ts';
import { createActivePublicationCache } from '../publications/active-publication-cache.ts';

describe('respondWithProfilePhoto', () => {
  it('returns 404 when the publication has no photo', async () => {
    const publication = {
      ...activePublicationFixture,
      content: {
        ...activePublicationFixture.content,
        profile: { ...activePublicationFixture.content.profile, photo: null },
      },
    };
    const cache = createActivePublicationCache({
      readActive: async () => publication,
      ping: async () => true,
    });
    const response = await respondWithProfilePhoto({
      cache,
      assets: { fetchAsset: async () => null },
      log: vi.fn(),
    });
    expect(response.status).toBe(404);
  });

  it('streams the asset with ETag and cache headers', async () => {
    const fileId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f43';
    const publication = {
      ...activePublicationFixture,
      content: {
        ...activePublicationFixture.content,
        profile: {
          ...activePublicationFixture.content.profile,
          photo: { fileId, alt: { en: 'Portrait', fr: 'Portrait' } },
        },
      },
    };
    const cache = createActivePublicationCache({
      readActive: async () => publication,
      ping: async () => true,
    });
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const response = await respondWithProfilePhoto({
      cache,
      assets: {
        fetchAsset: async (id) => {
          if (id !== fileId) {
            return null;
          }
          return { body: bytes.buffer, contentType: 'image/png' };
        },
      },
      log: vi.fn(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBe(`"${fileId}"`);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('rejects non-image content types', async () => {
    const fileId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f43';
    const publication = {
      ...activePublicationFixture,
      content: {
        ...activePublicationFixture.content,
        profile: {
          ...activePublicationFixture.content.profile,
          photo: { fileId, alt: { en: 'Portrait', fr: 'Portrait' } },
        },
      },
    };
    const cache = createActivePublicationCache({
      readActive: async () => publication,
      ping: async () => true,
    });
    const response = await respondWithProfilePhoto({
      cache,
      assets: {
        fetchAsset: async () => ({
          body: new ArrayBuffer(0),
          contentType: 'application/pdf',
        }),
      },
      log: vi.fn(),
    });
    expect(response.status).toBe(404);
  });
});

describe('createDirectusAssetFetcher', () => {
  it('returns null when the asset exceeds the size cap', async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    const fetchImpl = vi.fn(
      async () =>
        new Response(oversized, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
    );
    const fetcher = createDirectusAssetFetcher('https://cms.example.com', 'token', fetchImpl);
    const result = await fetcher.fetchAsset('file-uuid');
    expect(result).toBeNull();
  });

  it('requests the Directus asset URL with the service token', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(new Uint8Array([1]), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        })
    );
    const fetcher = createDirectusAssetFetcher('https://cms.example.com', 'token', fetchImpl);
    const result = await fetcher.fetchAsset('file-uuid');
    expect(result?.contentType).toBe('image/jpeg');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://cms.example.com/assets/file-uuid',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } })
    );
  });
});
