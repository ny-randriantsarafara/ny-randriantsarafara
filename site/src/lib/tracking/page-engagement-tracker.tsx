'use client';

import { useEffect } from 'react';

import { trackingAllowed } from './beacon.ts';
import {
  readEngagementSlice,
  readEngagementUntilHidden,
  startEngagementSession,
} from './page-engagement.ts';
import { trackEngagement } from './track-event.ts';

import type { Locale } from '@portfolio/content';

type PageEngagementTrackerProps = {
  locale: Locale;
  conversationId?: string;
};

const ENGAGEMENT_INTERVAL_MS = 30_000;

export function PageEngagementTracker({ locale, conversationId }: PageEngagementTrackerProps) {
  useEffect(() => {
    const session = startEngagementSession();

    const sendSlice = (read: () => { durationMs: number } | null): void => {
      if (!trackingAllowed()) {
        return;
      }
      const tick = read();
      if (tick === null) {
        return;
      }
      trackEngagement(locale, tick.durationMs, conversationId);
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        sendSlice(() => readEngagementUntilHidden(session));
        return;
      }
      session.lastSentMark = performance.now();
    };

    const interval = window.setInterval(() => {
      sendSlice(() => readEngagementSlice(session, performance.now()));
    }, ENGAGEMENT_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (document.visibilityState === 'visible') {
        sendSlice(() => readEngagementUntilHidden(session));
      }
    };
  }, [conversationId, locale]);

  return null;
}
