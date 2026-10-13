import { describe, expect, it, vi } from 'vitest';

import { PublicationConfigurationError, PublicationHookError } from '../errors.ts';
import { notifyPublicationHook, readHookConfiguration } from './hook.ts';
import type { HookFetch } from './hook.ts';

const configuration = {
  url: 'http://api.test/internal/publications/activated',
  secret: 'hook-secret',
};

describe('readHookConfiguration', () => {
  it('reads the hook URL and secret', () => {
    expect(
      readHookConfiguration({
        PUBLICATION_HOOK_URL: configuration.url,
        PUBLICATION_HOOK_SECRET: configuration.secret,
      })
    ).toEqual(configuration);
  });

  it.each(['PUBLICATION_HOOK_URL', 'PUBLICATION_HOOK_SECRET'])('fails when %s is empty', (name) => {
    const environment = {
      PUBLICATION_HOOK_URL: configuration.url,
      PUBLICATION_HOOK_SECRET: configuration.secret,
      [name]: '',
    };

    expect(() => readHookConfiguration(environment)).toThrow(PublicationConfigurationError);
  });
});

describe('notifyPublicationHook', () => {
  it('posts the publication id with the shared secret', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => new Response(null, { status: 204 }));

    await notifyPublicationHook(configuration, 'publication-1', fetchHook);

    expect(fetchHook).toHaveBeenCalledWith(
      configuration.url,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer hook-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicationId: 'publication-1' }),
      })
    );
  });

  it('reports a refused call with its status', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => new Response('Failure', { status: 500 }));

    await expect(notifyPublicationHook(configuration, 'publication-1', fetchHook)).rejects.toThrow(
      'Publication publication-1 is active, but the API was not notified (HTTP 500). Run Publish on it again to retry.'
    );
  });

  it('reports an unreachable API', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(notifyPublicationHook(configuration, 'publication-1', fetchHook)).rejects.toThrow(
      PublicationHookError
    );
  });

  it('reports an API that does not answer in time', async () => {
    const fetchHook = vi.fn<HookFetch>(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });

    await expect(notifyPublicationHook(configuration, 'publication-1', fetchHook)).rejects.toThrow(
      '(no answer within 10 s)'
    );
  });
});
