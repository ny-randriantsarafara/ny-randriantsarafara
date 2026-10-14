import { describe, expect, it, vi } from 'vitest';

import {
  createRaiseAlert,
  type AlertCreateResult,
  type AlertPayload,
  type AlertStore,
  type AlertEmailSender,
} from './raise-alert.ts';

describe('createRaiseAlert', () => {
  it('creates a row then sends email when delivery is configured', async () => {
    const create = vi.fn(
      async (_payload: AlertPayload): Promise<AlertCreateResult> => ({
        created: true,
      })
    );
    const send = vi.fn(async () => undefined);
    const store: AlertStore = { create };
    const email: AlertEmailSender = { send };
    const log = vi.fn();
    const raiseAlert = createRaiseAlert({ store, email, log });

    await raiseAlert({
      kind: 'contact_message',
      dedupKey: 'contact:00000000-0000-4000-8000-000000000001',
      subject: 'New contact message',
      text: 'A visitor wrote in.',
      details: { locale: 'en' },
    });

    expect(create).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
  });

  it('skips email when SMTP is not configured but still stores the alert', async () => {
    const create = vi.fn(
      async (_payload: AlertPayload): Promise<AlertCreateResult> => ({
        created: true,
      })
    );
    const store: AlertStore = { create };
    const log = vi.fn();
    const raiseAlert = createRaiseAlert({
      store,
      email: { send: vi.fn(async () => undefined) },
      log,
      emailEnabled: false,
    });

    await raiseAlert({
      kind: 'budget',
      dedupKey: 'budget:80:2026-10',
      subject: 'Budget threshold',
      text: '80% reached',
      details: { ratio: 0.8 },
    });

    expect(create).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('Alert email skipped: SMTP is not configured.');
  });

  it('returns silently when the dedup key already exists', async () => {
    const create = vi.fn(
      async (_payload: AlertPayload): Promise<AlertCreateResult> => ({
        created: false,
        reason: 'duplicate',
      })
    );
    const send = vi.fn(async () => undefined);
    const raiseAlert = createRaiseAlert({
      store: { create },
      email: { send },
      log: vi.fn(),
    });

    await raiseAlert({
      kind: 'site-build',
      dedupKey: 'site-build:2026-10-14',
      subject: 'Site build failed',
      text: 'Dispatch failed',
      details: { reason: 'network' },
    });

    expect(send).not.toHaveBeenCalled();
  });
});
