import { storedRecordsOf } from '@portfolio/cms-schema/testing';
import { contentFixture } from '@portfolio/content/testing';
import { vi } from 'vitest';

import type { PublicationStore } from '../publication-store.ts';

export function fakeStore(overrides: Partial<PublicationStore> = {}): PublicationStore {
  return {
    readWorkingRecords: vi.fn<PublicationStore['readWorkingRecords']>(async () =>
      storedRecordsOf(contentFixture)
    ),
    readActivePublication: vi.fn<PublicationStore['readActivePublication']>(async () => null),
    readPublication: vi.fn<PublicationStore['readPublication']>(async (id) => ({
      id,
      status: 'prepared',
      content: contentFixture,
    })),
    savePrepared: vi.fn<PublicationStore['savePrepared']>(async () => 'prepared-publication'),
    activate: vi.fn<PublicationStore['activate']>(async () => undefined),
    ...overrides,
  };
}
