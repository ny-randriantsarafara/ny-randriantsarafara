import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readEngagementSlice,
  readEngagementUntilHidden,
  startEngagementSession,
} from '../page-engagement.ts';

describe('page engagement slices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips ticks while the document is hidden', () => {
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    vi.stubGlobal('performance', { now: () => 5000 });
    const session = startEngagementSession();
    session.lastSentMark = 1000;
    expect(readEngagementSlice(session, 5000)).toBeNull();
  });

  it('measures elapsed performance time between ticks', () => {
    vi.stubGlobal('document', { visibilityState: 'visible' });
    let now = 1000;
    vi.stubGlobal('performance', { now: () => now });
    const session = startEngagementSession();
    now = 3500;
    const tick = readEngagementSlice(session, now);
    expect(tick?.durationMs).toBe(2500);
  });

  it('reports remaining visible time when the tab hides', () => {
    vi.stubGlobal('performance', { now: () => 9000 });
    const session = startEngagementSession();
    session.lastSentMark = 6000;
    const tick = readEngagementUntilHidden(session);
    expect(tick?.durationMs).toBe(3000);
  });
});
