import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetBeaconDeliveryForTests } from '../beacon.ts';
import { chatDeliveryEmissionGuard } from '../chat-delivery.ts';
import { resetJourneyMemoryForTests } from '../journey-memory.ts';
import { trackChatSubmitted, trackPageView } from '../track-event.ts';

describe('track-event correlation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetJourneyMemoryForTests();
    resetBeaconDeliveryForTests();
    chatDeliveryEmissionGuard.resetForTests();
  });

  it('includes journey and event identifiers in page views', () => {
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '0',
      sendBeacon,
    });
    vi.stubGlobal('window', {
      location: { hostname: 'nyhasinavalona.com', pathname: '/', search: '?utm_source=x' },
    });
    vi.stubGlobal('document', { referrer: '' });
    vi.stubGlobal('crypto', {
      randomUUID: () => '44444444-4444-4444-8444-444444444444',
    });
    trackPageView('en');
    expect(sendBeacon).toHaveBeenCalledOnce();
  });

  it('deduplicates chat submitted emissions for the same request id', async () => {
    const sendBeacon = vi.fn<(url: string, data: Blob) => boolean>(() => true);
    vi.stubGlobal('navigator', {
      globalPrivacyControl: false,
      doNotTrack: '0',
      sendBeacon,
    });
    vi.stubGlobal('window', {
      location: { hostname: 'nyhasinavalona.com', pathname: '/', search: '' },
    });
    vi.stubGlobal('document', { referrer: '' });
    vi.stubGlobal('crypto', {
      randomUUID: () => '55555555-5555-4555-8555-555555555555',
    });
    const conversationId = '66666666-6666-4666-8666-666666666666';
    const requestId = '77777777-7777-4777-8777-777777777777';
    trackChatSubmitted('en', conversationId, requestId);
    trackChatSubmitted('en', conversationId, requestId);
    expect(sendBeacon).toHaveBeenCalledOnce();
  });
});
