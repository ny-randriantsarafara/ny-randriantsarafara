import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageEngagementTracker } from '../page-engagement-tracker.tsx';

const trackEngagement = vi.fn();

vi.mock('../track-event.ts', () => ({
  trackEngagement: (...args: unknown[]) => trackEngagement(...args),
}));

vi.mock('../beacon.ts', () => ({
  trackingAllowed: () => false,
}));

describe('PageEngagementTracker privacy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    trackEngagement.mockClear();
  });

  it('does not flush engagement when tracking is disallowed', () => {
    const { unmount } = render(
      <PageEngagementTracker locale="en" conversationId="3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42" />
    );
    unmount();
    expect(trackEngagement).not.toHaveBeenCalled();
  });
});
