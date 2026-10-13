import type { ActivePublication } from '@portfolio/content';
import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { createActivePublicationCache } from './active-publication-cache.ts';
import type { PublicationSource } from './publication-source.ts';

const updatedPublication: ActivePublication = {
  ...activePublicationFixture,
  publicationId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
};

function sourceReading(readActive: PublicationSource['readActive']): PublicationSource {
  return { readActive, ping: async () => true };
}

function resolveLater(
  publication: ActivePublication | null,
  delayMs: number
): Promise<ActivePublication | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(publication), delayMs);
  });
}

describe('createActivePublicationCache', () => {
  it('loads lazily and reuses a cached publication', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValue(activePublicationFixture);
    const cache = createActivePublicationCache(sourceReading(readActive));

    expect(readActive).not.toHaveBeenCalled();
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    expect(readActive).toHaveBeenCalledTimes(1);
  });

  it('reads again after finding no active publication', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activePublicationFixture);
    const cache = createActivePublicationCache(sourceReading(readActive));

    await expect(cache.current()).resolves.toBeNull();
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
    expect(readActive).toHaveBeenCalledTimes(2);
  });

  it('shares one read between concurrent first requests', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockImplementation(() => resolveLater(activePublicationFixture, 10));
    const cache = createActivePublicationCache(sourceReading(readActive));

    await expect(Promise.all([cache.current(), cache.current()])).resolves.toEqual([
      activePublicationFixture,
      activePublicationFixture,
    ]);
    expect(readActive).toHaveBeenCalledTimes(1);
  });

  it('always reads the source on reload', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(activePublicationFixture)
      .mockResolvedValueOnce(updatedPublication);
    const cache = createActivePublicationCache(sourceReading(readActive));

    await cache.current();
    await expect(cache.reload()).resolves.toEqual(updatedPublication);
    await expect(cache.current()).resolves.toEqual(updatedPublication);
    expect(readActive).toHaveBeenCalledTimes(2);
  });

  it('keeps the previous publication when a reload fails', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockResolvedValueOnce(activePublicationFixture)
      .mockRejectedValueOnce(new Error('Directus down'));
    const cache = createActivePublicationCache(sourceReading(readActive));

    await cache.current();
    await expect(cache.reload()).rejects.toThrow('Directus down');
    await expect(cache.current()).resolves.toEqual(activePublicationFixture);
  });

  it('never lets an older read overwrite a newer reload', async () => {
    const readActive = vi
      .fn<PublicationSource['readActive']>()
      .mockImplementationOnce(() => resolveLater(activePublicationFixture, 20))
      .mockResolvedValueOnce(updatedPublication);
    const cache = createActivePublicationCache(sourceReading(readActive));

    const firstRequest = cache.current();
    await expect(cache.reload()).resolves.toEqual(updatedPublication);
    await firstRequest;
    await expect(cache.current()).resolves.toEqual(updatedPublication);
  });
});
