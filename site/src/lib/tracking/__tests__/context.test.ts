import { afterEach, describe, expect, it, vi } from 'vitest';

import { readTrackingContext } from '../context.ts';

describe('readTrackingContext referrer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends only the referrer host', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/fr', search: '' },
    });
    vi.stubGlobal('document', {
      referrer: 'https://www.example.com/path?q=1',
    });
    const context = readTrackingContext('fr');
    expect(context.referrer).toBe('www.example.com');
  });
});
