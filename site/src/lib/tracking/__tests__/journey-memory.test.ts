import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCorrelationFields,
  readJourneyId,
  readLandingAcquisition,
  resetJourneyMemoryForTests,
} from '../journey-memory.ts';

describe('journey memory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetJourneyMemoryForTests();
  });

  it('keeps a stable journey id for the page lifetime', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
    vi.stubGlobal('window', { location: { pathname: '/', search: '' } });
    vi.stubGlobal('document', { referrer: '' });
    const first = readJourneyId();
    vi.stubGlobal('window', { location: { pathname: '/privacy', search: '' } });
    const second = readJourneyId();
    expect(first).toBe(second);
  });

  it('preserves landing acquisition after the path changes', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
    vi.stubGlobal('window', {
      location: { pathname: '/', search: '?utm_source=newsletter&utm_medium=email' },
    });
    vi.stubGlobal('document', { referrer: 'https://example.org/landing' });
    readJourneyId();
    vi.stubGlobal('window', { location: { pathname: '/privacy', search: '' } });
    const landing = readLandingAcquisition();
    expect(landing.utmSource).toBe('newsletter');
    expect(landing.utmMedium).toBe('email');
    expect(landing.referrer).toBe('example.org');
    const fields = buildCorrelationFields('en');
    expect(fields.path).toBe('/privacy');
    expect(fields.utm_source).toBe('newsletter');
    expect(fields.journeyId).toBe('11111111-1111-4111-8111-111111111111');
  });
});
