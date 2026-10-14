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
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '0',
      sendBeacon,
    });
    vi.stubGlobal('window', {
      location: { hostname: 'nyhasinavalona.com' },
    });
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en' });
    expect(sendBeacon).toHaveBeenCalledOnce();
    const firstCall = sendBeacon.mock.calls.at(0);
    if (firstCall === undefined) {
      throw new Error('expected sendBeacon to be called');
    }
    expect(String(firstCall[0])).toContain('/events');
    expect(firstCall[1]).toBeInstanceOf(Blob);
  });

  it('skips beacons on localhost static preview', () => {
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '0',
      sendBeacon,
    });
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
    });
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en' });
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('skips beacons when DNT is enabled', () => {
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '1',
      sendBeacon,
    });
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en' });
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
