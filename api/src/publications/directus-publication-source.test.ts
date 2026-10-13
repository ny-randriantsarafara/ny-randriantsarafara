import { contentFixture } from '@portfolio/content/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createDirectusPublicationSource,
  toActivePublication,
} from './directus-publication-source.ts';
import { PublicationSourceError } from './publication-source.ts';

const publicationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';

describe('toActivePublication', () => {
  it('maps a valid Directus row', () => {
    expect(
      toActivePublication({
        id: publicationId,
        content: contentFixture,
        activated_at: '2026-10-13T08:00:00.000Z',
      })
    ).toEqual({
      publicationId,
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: contentFixture,
    });
  });

  it('refuses a row without activated_at', () => {
    expect(() =>
      toActivePublication({ id: publicationId, content: contentFixture, activated_at: null })
    ).toThrow('activation timestamp');
  });

  it('refuses invalid content without echoing values', () => {
    expect(() =>
      toActivePublication({
        id: publicationId,
        content: { profile: null },
        activated_at: '2026-10-13T08:00:00.000Z',
      })
    ).toThrow(/Invalid publication content/);
  });
});

describe('createDirectusPublicationSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps a Directus error response in PublicationSourceError', async () => {
    const directusMessage = 'Invalid user credentials.';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { errors: [{ message: directusMessage, extensions: { code: 'INVALID_CREDENTIALS' } }] },
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    const source = createDirectusPublicationSource('http://directus.test', 'token');

    await expect(source.readActive()).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof PublicationSourceError && error.message.includes(directusMessage)
    );
  });

  it('wraps a malformed Directus row in PublicationSourceError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { data: [{ content: {}, activated_at: '2026-10-13T08:00:00.000Z' }] },
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    const source = createDirectusPublicationSource('http://directus.test', 'token');

    await expect(source.readActive()).rejects.toThrow(PublicationSourceError);
  });
});
