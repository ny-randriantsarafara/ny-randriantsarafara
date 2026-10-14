import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendEventBeacon, trackingAllowed } from '../beacon.ts';

describe('tracking beacon', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('honours GPC and DNT', () => {
    vi.stubGlobal('navigator', {
      globalPrivacyControl: true,
      doNotTrack: '0',
      sendBeacon: vi.fn(),
    });
    expect(trackingAllowed()).toBe(false);
  });

  it('sends a text/plain beacon payload', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '0',
      sendBeacon,
    });
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en' });
    expect(sendBeacon).toHaveBeenCalledWith(
      expect.stringContaining('/events'),
      JSON.stringify({ type: 'page_view', path: '/', locale: 'en' })
    );
  });

  it('skips beacons when DNT is enabled', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '1',
      sendBeacon,
    });
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en' });
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
