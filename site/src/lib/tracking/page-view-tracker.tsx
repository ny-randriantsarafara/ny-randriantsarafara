'use client';

import { useEffect } from 'react';

import { trackPageView } from './track-event.ts';

import type { Locale } from '@portfolio/content';

type PageViewTrackerProps = {
  locale: Locale;
};

export function PageViewTracker({ locale }: PageViewTrackerProps) {
  useEffect(() => {
    const schedule = (): void => {
      trackPageView(locale);
    };
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(schedule, { timeout: 3000 });
      return () => cancelIdleCallback(handle);
    }
    const timeout = window.setTimeout(schedule, 0);
    return () => window.clearTimeout(timeout);
  }, [locale]);

  return null;
}
