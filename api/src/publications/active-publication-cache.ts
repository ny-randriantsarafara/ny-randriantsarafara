import type { ActivePublication } from '@portfolio/content';

import type { PublicationSource } from './publication-source.ts';

export type ActivePublicationCache = {
  current(): Promise<ActivePublication | null>;
  reload(): Promise<ActivePublication | null>;
};

type CacheState = {
  publication: ActivePublication | null;
  latestRead: number;
  pendingFirstRead: Promise<ActivePublication | null> | null;
};

export function createActivePublicationCache(source: PublicationSource): ActivePublicationCache {
  // The API's only state between requests. Only the most recently started read may replace the
  // cached publication, so a slow read that began before an activation cannot undo a reload.
  const state: CacheState = { publication: null, latestRead: 0, pendingFirstRead: null };

  async function read(): Promise<ActivePublication | null> {
    state.latestRead += 1;
    const readNumber = state.latestRead;
    const publication = await source.readActive();
    if (readNumber === state.latestRead) {
      state.publication = publication;
    }
    return publication;
  }

  function sharedFirstRead(): Promise<ActivePublication | null> {
    if (state.pendingFirstRead === null) {
      state.pendingFirstRead = read().finally(() => {
        state.pendingFirstRead = null;
      });
    }
    return state.pendingFirstRead;
  }

  return {
    current: async () => {
      if (state.publication !== null) {
        return state.publication;
      }
      return sharedFirstRead();
    },
    reload: read,
  };
}
