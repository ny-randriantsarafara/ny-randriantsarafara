import { describe, expect, it, vi } from 'vitest';

import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { createContactService } from './contact-service.ts';
import type { ContactStore } from './contact-store.ts';
import type { RaiseAlert } from '../alerts/raise-alert.ts';

describe('createContactService', () => {
  it('accepts honeypot submissions without storing them', async () => {
    const save = vi.fn(async () => undefined);
    const store: ContactStore = { save };
    const raiseAlert: RaiseAlert = vi.fn(async () => undefined);
    const service = createContactService({
      store,
      raiseAlert,
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

  it('stores and raises an alert for a valid submission', async () => {
    const save = vi.fn(async () => undefined);
    const raiseAlert = vi.fn(async () => undefined);
    const service = createContactService({
      store: { save },
      raiseAlert,
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
    expect(raiseAlert).toHaveBeenCalledOnce();
    const alertPayload = raiseAlert.mock.calls[0]?.[0];
    expect(alertPayload?.kind).toBe('contact_message');
    expect(alertPayload?.dedupKey).toMatch(/^contact:[0-9a-f-]{36}$/);
    expect(alertPayload?.details).toEqual({
      locale: 'en',
      replyTo: 'recruiter@example.com',
    });
  });

  it('returns after storing without waiting for the alert', async () => {
    const service = createContactService({
      store: { save: async () => undefined },
      raiseAlert: () => new Promise(() => undefined),
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
