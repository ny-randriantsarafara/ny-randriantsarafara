import { describe, expect, it, vi } from 'vitest';

import { createRetentionJob } from './retention-job.ts';
import { retentionEventsCutoffIso } from './retention-cutoff.ts';

describe('retentionEventsCutoffIso', () => {
  it('subtracts thirteen months from the current instant', () => {
    const cutoff = retentionEventsCutoffIso(() => new Date('2026-10-14T12:00:00.000Z'));
    expect(cutoff.startsWith('2025-09-14')).toBe(true);
  });
});

describe('createRetentionJob', () => {
  it('purges events, chat exchanges and previous visitor salts', async () => {
    const store = {
      deleteExpiredEvents: vi.fn(async () => 2),
      deleteExpiredChatExchanges: vi.fn(async () => 1),
      deletePreviousVisitorSalts: vi.fn(async () => 3),
    };
    const log = vi.fn();
    await createRetentionJob({
      store,
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
      log,
    }).run();
    expect(store.deleteExpiredEvents).toHaveBeenCalledOnce();
    expect(store.deleteExpiredChatExchanges).toHaveBeenCalledOnce();
    expect(store.deletePreviousVisitorSalts).toHaveBeenCalledWith('2026-10-14');
    expect(log).toHaveBeenCalledOnce();
  });
});
