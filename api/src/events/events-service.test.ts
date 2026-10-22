import { describe, expect, it, vi } from 'vitest';

import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { createEventsService } from './events-service.ts';
import type { EventStore } from './event-store.ts';

function createStore(): EventStore & { saved: Parameters<EventStore['save']>[0][] } {
  const saved: Parameters<EventStore['save']>[0][] = [];
  return {
    saved,
    save: async (event) => {
      saved.push(event);
    },
  };
}

describe('createEventsService', () => {
  it('discards DNT requests without storing', async () => {
    const store = createStore();
    const service = createEventsService({
      store,
      visitorHasher: { derive: async () => 'abcd1234abcd1234' },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-01-01T12:00:00.000Z'),
    });
    const headers = new Headers({ DNT: '1' });
    const result = await service.handle({
      body: { type: 'page_view', path: '/', locale: 'en' },
      userAgent: 'Mozilla/5.0',
      ipAddress: '203.0.113.1',
      privacyHeaders: headers,
    });
    expect(result.status).toBe(204);
    expect(store.saved).toEqual([]);
  });

  it('returns 400 for invalid bodies', async () => {
    const store = createStore();
    const service = createEventsService({
      store,
      visitorHasher: { derive: async () => 'abcd1234abcd1234' },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-01-01T12:00:00.000Z'),
    });
    const result = await service.handle({
      body: { type: 'page_view', path: 'bad', locale: 'en' },
      userAgent: 'Mozilla/5.0',
      ipAddress: '203.0.113.1',
      privacyHeaders: new Headers(),
    });
    expect(result.status).toBe(400);
    expect(store.saved).toEqual([]);
  });

  it('stores valid events asynchronously', async () => {
    const store = createStore();
    const service = createEventsService({
      store,
      visitorHasher: { derive: async () => 'abcd1234abcd1234' },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-01-01T12:00:00.000Z'),
    });
    const result = await service.handle({
      body: { type: 'page_view', path: '/', locale: 'en', referrer: 'https://example.com/x' },
      userAgent: 'Mozilla/5.0 (Macintosh)',
      ipAddress: '203.0.113.1',
      privacyHeaders: new Headers(),
    });
    expect(result.status).toBe(204);
    await vi.waitFor(() => {
      expect(store.saved.length).toBe(1);
    });
    expect(store.saved[0]?.referrerHost).toBe('example.com');
  });

  it('stores a bare referrer hostname from the client', async () => {
    const store = createStore();
    const service = createEventsService({
      store,
      visitorHasher: { derive: async () => 'abcd1234abcd1234' },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-01-01T12:00:00.000Z'),
    });
    await service.handle({
      body: { type: 'page_view', path: '/', locale: 'en', referrer: 'news.example.com' },
      userAgent: 'Mozilla/5.0',
      ipAddress: '203.0.113.1',
      privacyHeaders: new Headers(),
    });
    await vi.waitFor(() => {
      expect(store.saved.length).toBe(1);
    });
    expect(store.saved[0]?.referrerHost).toBe('news.example.com');
  });
});

describe('analytics event capture', () => {
  it('separates receipt from occurrence and sanitizes URL query data and acquisition values', async () => {
    const store = createStore();
    const service = createEventsService({
      store,
      visitorHasher: { derive: async () => 'daily' },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-10-22T11:00:00Z'),
    });
    await service.handle({
      body: {
        type: 'chat_rendered',
        path: '/?email=jane@example.com#secret',
        locale: 'en',
        eventId: '00000000-0000-4000-8000-000000000012',
        occurredAt: '2026-10-22T10:00:00Z',
        durationMs: 123,
        mode: 'model',
        utm_campaign: 'jane@example.com',
      },
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      privacyHeaders: new Headers(),
    });
    expect(store.saved[0]).toMatchObject({
      eventId: '00000000-0000-4000-8000-000000000012',
      occurredAt: '2026-10-22T10:00:00Z',
      receivedAt: '2026-10-22T11:00:00.000Z',
      path: '/',
      utmCampaign: '[email]',
      payload: { durationMs: 123, mode: 'model' },
    });
  });
  it.each([
    { headers: { 'Sec-GPC': '1' }, agent: 'Mozilla/5.0' },
    { headers: {}, agent: 'Googlebot' },
  ])('discards privacy-excluded lifecycle events', async ({ headers, agent }) => {
    const store = createStore();
    const service = createEventsService({
      store,
      visitorHasher: { derive: async () => 'daily' },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date(),
    });
    await service.handle({
      body: { type: 'chat_submitted', path: '/', locale: 'en' },
      userAgent: agent,
      ipAddress: '127.0.0.1',
      privacyHeaders: new Headers(headers),
    });
    expect(store.saved).toEqual([]);
  });
});
