import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetBeaconDeliveryForTests, sendEventBeacon } from '../beacon.ts';

function stubTrackingEnvironment(sendBeacon: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal('navigator', {
    globalPrivacyControl: false,
    doNotTrack: '0',
    sendBeacon,
  });
  vi.stubGlobal('window', {
    location: { hostname: 'nyhasinavalona.com' },
  });
  vi.stubGlobal('crypto', {
    randomUUID: () => '33333333-3333-4333-8333-333333333333',
  });
}

describe('sendEventBeacon delivery dedupe', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetBeaconDeliveryForTests();
  });

  it('reuses a stable event id across beacon and fetch fallback', async () => {
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => false);
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('', { status: 204 }));
    stubTrackingEnvironment(sendBeacon);
    vi.stubGlobal('fetch', fetchFn);
    sendEventBeacon({
      type: 'page_view',
      path: '/',
      locale: 'en',
      eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledOnce();
    const beaconBody = await sendBeacon.mock.calls[0]?.[1]?.text();
    const fetchInit = fetchFn.mock.calls[0]?.[1];
    const rawBody = fetchInit?.body;
    let fetchBody = '';
    if (typeof rawBody === 'string') {
      fetchBody = rawBody;
    } else if (rawBody instanceof Blob) {
      fetchBody = await rawBody.text();
    }
    expect(beaconBody).toContain('"eventId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"');
    expect(fetchBody).toContain('"eventId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"');
  });

  it('does not deliver the same event id twice', () => {
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
    stubTrackingEnvironment(sendBeacon);
    const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en', eventId });
    sendEventBeacon({ type: 'page_view', path: '/', locale: 'en', eventId });
    expect(sendBeacon).toHaveBeenCalledOnce();
  });
});
