import { describe, expect, it, vi } from 'vitest';

import type { SiteBuildConfiguration } from '../environment.ts';
import {
  createSiteBuildDispatcher,
  describeSiteBuildOutcome,
  type SiteBuildFetch,
  type SiteBuildOutcome,
} from './site-build-dispatcher.ts';

const configuration: SiteBuildConfiguration = {
  repository: 'ny-randriantsarafara/ny-randriantsarafara',
  environment: 'staging',
  token: 'github-token',
};

function respondingWith(status: number): SiteBuildFetch {
  return vi.fn<SiteBuildFetch>(async () => new Response(null, { status }));
}

describe('createSiteBuildDispatcher', () => {
  it('skips when site builds are not configured', async () => {
    const fetchDispatch = respondingWith(204);

    const outcome = await createSiteBuildDispatcher(null, fetchDispatch).dispatch();

    expect(outcome).toEqual({ status: 'skipped', reason: 'site builds are not configured' });
    expect(fetchDispatch).not.toHaveBeenCalled();
  });

  it('skips while the GitHub token is missing', async () => {
    const fetchDispatch = respondingWith(204);

    const outcome = await createSiteBuildDispatcher(
      { ...configuration, token: null },
      fetchDispatch
    ).dispatch();

    expect(outcome).toEqual({ status: 'skipped', reason: 'SITE_BUILD_TOKEN is not set' });
    expect(fetchDispatch).not.toHaveBeenCalled();
  });

  it('dispatches the content workflow on main for its environment', async () => {
    const fetchDispatch = vi.fn<SiteBuildFetch>(async () => new Response(null, { status: 204 }));

    const outcome = await createSiteBuildDispatcher(configuration, fetchDispatch).dispatch();

    expect(outcome).toEqual({ status: 'dispatched', environment: 'staging' });
    const [url, init] = fetchDispatch.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://api.github.com/repos/ny-randriantsarafara/ny-randriantsarafara/actions/workflows/content.yml/dispatches'
    );
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer github-token');
    expect(init?.body).toBe(JSON.stringify({ ref: 'main', inputs: { environment: 'staging' } }));
  });

  it.each([401, 403])('reports a rejected token (HTTP %i)', async (status) => {
    const outcome = await createSiteBuildDispatcher(
      configuration,
      respondingWith(status)
    ).dispatch();

    expect(outcome).toEqual({
      status: 'failed',
      reason: `GitHub rejected the token (HTTP ${status})`,
    });
  });

  it('reports another GitHub error status', async () => {
    const outcome = await createSiteBuildDispatcher(configuration, respondingWith(422)).dispatch();

    expect(outcome).toEqual({ status: 'failed', reason: 'GitHub answered HTTP 422' });
  });

  it('reports a network failure without throwing', async () => {
    const fetchDispatch = vi.fn<SiteBuildFetch>(async () => {
      throw new TypeError('fetch failed');
    });

    const outcome = await createSiteBuildDispatcher(configuration, fetchDispatch).dispatch();

    expect(outcome).toEqual({ status: 'failed', reason: 'fetch failed' });
  });

  it('reports a timeout', async () => {
    const fetchDispatch = vi.fn<SiteBuildFetch>(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });

    const outcome = await createSiteBuildDispatcher(configuration, fetchDispatch).dispatch();

    expect(outcome).toEqual({ status: 'failed', reason: 'GitHub did not answer within 5 s' });
  });
});

describe('describeSiteBuildOutcome', () => {
  it.each<[SiteBuildOutcome, string]>([
    [{ status: 'dispatched', environment: 'production' }, 'Site build dispatched for production'],
    [
      { status: 'skipped', reason: 'SITE_BUILD_TOKEN is not set' },
      'Site build skipped: SITE_BUILD_TOKEN is not set',
    ],
    [
      { status: 'failed', reason: 'GitHub answered HTTP 422' },
      'Site build dispatch failed: GitHub answered HTTP 422',
    ],
  ])('describes %o', (outcome, message) => {
    expect(describeSiteBuildOutcome(outcome)).toBe(message);
  });
});
