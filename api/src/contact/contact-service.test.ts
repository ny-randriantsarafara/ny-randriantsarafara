import { describe, expect, it, vi } from 'vitest';

import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { createContactService } from './contact-service.ts';
import type { ContactNotifier } from './contact-notifier.ts';
import type { ContactStore } from './contact-store.ts';

describe('createContactService', () => {
  it('accepts honeypot submissions without storing them', async () => {
    const save = vi.fn(async () => undefined);
    const store: ContactStore = { save };
    const notifier: ContactNotifier = { notify: vi.fn(async () => undefined) };
    const service = createContactService({
      store,
      notifier,
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });

    const result = await service.handle(
      {
        name: 'Bot',
        email: 'bot@example.com',
        message: 'Spam',
        locale: 'en',
        website: 'http://spam.example',
        elapsedMilliseconds: 10_000,
      },
      'visitor'
    );

    expect(result.status).toBe(200);
    expect(save).not.toHaveBeenCalled();
  });

  it('stores and notifies for a valid submission', async () => {
    const save = vi.fn(async () => undefined);
    const notify = vi.fn(async () => undefined);
    const service = createContactService({
      store: { save },
      notifier: { notify },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });

    const result = await service.handle(
      {
        name: 'Recruiter',
        email: 'recruiter@example.com',
        message: 'We should talk soon.',
        locale: 'en',
        website: '',
        elapsedMilliseconds: 5_000,
      },
      'visitor'
    );

    expect(result.status).toBe(200);
    expect(save).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledOnce();
  });

  it('returns after storing without waiting for notification', async () => {
    const service = createContactService({
      store: { save: async () => undefined },
      notifier: { notify: () => new Promise(() => undefined) },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });
    const startedAt = Date.now();
    const result = await service.handle(
      {
        name: 'Recruiter',
        email: 'recruiter@example.com',
        message: 'We should talk soon.',
        locale: 'en',
        website: '',
        elapsedMilliseconds: 5_000,
      },
      'visitor'
    );
    expect(Date.now() - startedAt).toBeLessThan(200);
    expect(result.status).toBe(200);
  });
});

describe('stored contact conversion', () => {
  const request = {
    name: 'Private name',
    email: 'private@example.com',
    message: 'Private message',
    locale: 'en',
    website: '',
    elapsedMilliseconds: 5000,
    journeyId: '00000000-0000-4000-8000-000000000011',
  };
  it('records conversion only after actual storage and contains no contact contents', async () => {
    let release!: () => void;
    const saved = new Promise<void>((resolve) => {
      release = resolve;
    });
    const events: unknown[] = [];
    const service = createContactService({
      store: { save: () => saved },
      notifier: { notify: async () => {} },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date('2026-10-22T10:00:00Z'),
      eventStore: {
        save: async (event) => {
          events.push(event);
        },
      },
    });
    const response = service.handle(request, 'daily');
    await Promise.resolve();
    expect(events).toEqual([]);
    release();
    await response;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'contact_stored',
      journeyId: request.journeyId,
      receivedAt: '2026-10-22T10:00:00.000Z',
    });
    expect(JSON.stringify(events)).not.toMatch(/Private|private@example/);
  });
  it('emits no conversion for spam, storage failure, or privacy exclusion', async () => {
    const events: unknown[] = [];
    let fail = false;
    const service = createContactService({
      store: {
        save: async () => {
          if (fail) throw new Error('unavailable');
        },
      },
      notifier: { notify: async () => {} },
      rateLimiter: createMemoryRateLimiter(),
      clock: () => new Date(),
      eventStore: {
        save: async (event) => {
          events.push(event);
        },
      },
    });
    await service.handle({ ...request, website: 'spam' }, 'daily');
    await service.handle(request, 'daily', { analyticsExcluded: true });
    fail = true;
    await expect(service.handle(request, 'daily')).rejects.toThrow('unavailable');
    expect(events).toEqual([]);
  });
});
