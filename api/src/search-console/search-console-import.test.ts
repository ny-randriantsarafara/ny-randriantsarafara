import { describe, expect, it, vi } from 'vitest';

import { createSearchConsoleImportJob } from './search-console-import.ts';

describe('createSearchConsoleImportJob', () => {
  it('raises a daily alert when the import fails', async () => {
    const raiseAlert = vi.fn(async () => undefined);
    await createSearchConsoleImportJob({
      client: {
        queryRange: async () => {
          throw new Error('network');
        },
      },
      store: { upsertRows: async () => ({ created: 0, updated: 0 }) },
      raiseAlert,
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
      log: vi.fn(),
    }).run();
    expect(raiseAlert).toHaveBeenCalledOnce();
    expect(raiseAlert.mock.calls[0]?.[0]?.dedupKey).toMatch(/^search-console:2026-10-14$/);
  });
});
