import { activePublicationFixture } from '@portfolio/content/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadPublicationClient,
  schedulePublicationPrefetch,
} from '@/lib/publication/load-publication-client.ts';

describe('loadPublicationClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and validates publication JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(activePublicationFixture), { status: 200 }))
    );
    const publication = await loadPublicationClient();
    expect(publication.publicationId).toBe(activePublicationFixture.publicationId);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    );
    await expect(loadPublicationClient()).rejects.toThrow(/failed/i);
  });
});

describe('schedulePublicationPrefetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefetches without throwing in jsdom', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 50 });
      return 0;
    });
    expect(() => schedulePublicationPrefetch()).not.toThrow();
  });
});
