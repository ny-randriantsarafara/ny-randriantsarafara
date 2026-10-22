import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetBeaconDeliveryForTests } from '../beacon.ts';
import { resetJourneyMemoryForTests } from '../journey-memory.ts';
import { trackContactSubmit } from '../track-event.ts';

describe('trackContactSubmit correlation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetJourneyMemoryForTests();
    resetBeaconDeliveryForTests();
  });

  it('includes the contact request id alongside conversation id', async () => {
    const payloads: string[] = [];
    const sendBeacon = vi.fn((_url: string, data: Blob) => {
      void data.text().then((body) => payloads.push(body));
      return true;
    });
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '0',
      sendBeacon,
    });
    vi.stubGlobal('window', {
      location: { hostname: 'nyhasinavalona.com', pathname: '/', search: '' },
    });
    vi.stubGlobal('document', { referrer: '' });
    vi.stubGlobal('crypto', { randomUUID: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    const conversationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';
    const requestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    trackContactSubmit('en', conversationId, requestId);
    await vi.waitFor(() => expect(payloads.length).toBe(1));
    const parsed = JSON.parse(payloads[0] ?? '{}') as {
      type: string;
      conversationId?: string;
      requestId?: string;
    };
    expect(parsed.type).toBe('contact_submit');
    expect(parsed.conversationId).toBe(conversationId);
    expect(parsed.requestId).toBe(requestId);
  });
});
