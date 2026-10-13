import { describe, expect, it } from 'vitest';

import { activePublicationSchema } from './active-publication.ts';
import { contentFixture } from './testing/fixture.ts';

const publicationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';

describe('activePublicationSchema', () => {
  it('accepts a valid fixture with Z timestamp', () => {
    const parsed = activePublicationSchema.parse({
      publicationId,
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: contentFixture,
    });

    expect(parsed.publicationId).toBe(publicationId);
  });

  it('accepts an ISO timestamp with a numeric offset', () => {
    const parsed = activePublicationSchema.parse({
      publicationId,
      activatedAt: '2026-10-13T10:00:00.000+02:00',
      content: contentFixture,
    });

    expect(parsed.activatedAt).toBe('2026-10-13T10:00:00.000+02:00');
  });

  it('refuses a non-UUID publication id', () => {
    const result = activePublicationSchema.safeParse({
      publicationId: 'not-a-uuid',
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: contentFixture,
    });

    expect(result.success).toBe(false);
  });

  it('refuses a non-ISO activatedAt', () => {
    const result = activePublicationSchema.safeParse({
      publicationId,
      activatedAt: '2026-10-13',
      content: contentFixture,
    });

    expect(result.success).toBe(false);
  });

  it('refuses invalid publication content', () => {
    const result = activePublicationSchema.safeParse({
      publicationId,
      activatedAt: '2026-10-13T08:00:00.000Z',
      content: { profile: null },
    });

    expect(result.success).toBe(false);
  });
});
