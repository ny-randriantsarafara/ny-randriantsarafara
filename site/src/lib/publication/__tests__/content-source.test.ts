import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { fetchActivePublication, seedPublication } from '../content-source.ts';

describe('seedPublication', () => {
  it('wraps content with the fixed seed identifiers', () => {
    expect(seedPublication(contentFixture)).toEqual({
      publicationId: '00000000-0000-4000-8000-000000000000',
      activatedAt: '2026-01-01T00:00:00.000Z',
      content: contentFixture,
    });
  });
});

describe('fetchActivePublication', () => {
  it('returns JSON from a successful response', async () => {
    const body = { publicationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42' };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    await expect(fetchActivePublication('http://127.0.0.1:8066', fetchImpl)).resolves.toEqual(body);
  });

  it('throws on non-200 responses', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    await expect(fetchActivePublication('http://127.0.0.1:8066', fetchImpl)).rejects.toThrow(/503/);
  });
});
