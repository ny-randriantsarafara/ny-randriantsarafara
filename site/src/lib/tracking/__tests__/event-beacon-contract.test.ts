import { eventRequestSchema } from '@portfolio/api/events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetBeaconDeliveryForTests } from '../beacon.ts';
import { chatDeliveryEmissionGuard } from '../chat-delivery.ts';
import { resetJourneyMemoryForTests } from '../journey-memory.ts';
import {
  trackChatLocalFallback,
  trackChatRendered,
  trackEngagement,
  trackPageView,
} from '../track-event.ts';

const journeyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const conversationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const requestId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function stubTrackingTransport(captured: string[]): void {
  const sendBeacon = vi.fn((_url: string, data: Blob) => {
    void data.text().then((body) => captured.push(body));
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
  let uuidCall = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => {
      uuidCall += 1;
      if (uuidCall === 1) {
        return journeyId;
      }
      return 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    },
  });
  vi.stubGlobal('performance', { now: () => 1_000, mark: () => {}, measure: () => {} });
}

describe('site beacon wire format vs API eventRequestSchema', () => {
  const payloads: string[] = [];

  afterEach(() => {
    vi.unstubAllGlobals();
    resetJourneyMemoryForTests();
    resetBeaconDeliveryForTests();
    chatDeliveryEmissionGuard.resetForTests();
    payloads.length = 0;
  });

  it('rejects stringified durationMs (regression guard for pre-fix site emitters)', () => {
    const common = {
      path: '/',
      locale: 'en' as const,
      journeyId,
      conversationId,
      requestId,
    };
    expect(
      eventRequestSchema.safeParse({
        ...common,
        type: 'chat_rendered',
        mode: 'scripted',
        durationMs: '150',
      }).success
    ).toBe(false);
    expect(
      eventRequestSchema.safeParse({
        ...common,
        type: 'chat_rendered',
        mode: 'scripted',
        durationMs: 150,
      }).success
    ).toBe(true);
  });

  it('accepts JSON from real trackChatRendered through sendEventBeacon', async () => {
    stubTrackingTransport(payloads);
    trackChatRendered('en', conversationId, requestId, 500, 'scripted', false);
    await vi.waitFor(() => expect(payloads.length).toBe(1));
    const parsed: unknown = JSON.parse(payloads[0] ?? '{}');
    const validated = eventRequestSchema.parse(parsed);
    expect(validated.type).toBe('chat_rendered');
    if (validated.type === 'chat_rendered') {
      expect(typeof validated.durationMs).toBe('number');
      expect(validated.mode).toBe('scripted');
    }
  });

  it('accepts JSON from real trackEngagement through sendEventBeacon', async () => {
    stubTrackingTransport(payloads);
    trackEngagement('en', 12_000, conversationId);
    await vi.waitFor(() => expect(payloads.length).toBe(1));
    const parsed: unknown = JSON.parse(payloads[0] ?? '{}');
    expect(eventRequestSchema.parse(parsed)).toMatchObject({
      type: 'engagement',
      durationMs: 12_000,
    });
  });

  it('accepts JSON from real trackChatLocalFallback through sendEventBeacon', async () => {
    stubTrackingTransport(payloads);
    trackChatLocalFallback('en', conversationId, requestId, 'timeout', 'Local scripted reply', 500);
    await vi.waitFor(() => expect(payloads.length).toBe(1));
    const parsed: unknown = JSON.parse(payloads[0] ?? '{}');
    expect(eventRequestSchema.parse(parsed)).toMatchObject({
      type: 'chat_local_fallback',
      reason: 'timeout',
      text: 'Local scripted reply',
    });
    expect(typeof (parsed as { durationMs?: unknown }).durationMs).toBe('number');
  });

  it('accepts JSON from real trackPageView through sendEventBeacon', async () => {
    stubTrackingTransport(payloads);
    trackPageView('en');
    await vi.waitFor(() => expect(payloads.length).toBe(1));
    eventRequestSchema.parse(JSON.parse(payloads[0] ?? '{}'));
  });
});
