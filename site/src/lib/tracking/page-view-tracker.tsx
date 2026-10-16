'use client';

import { useEffect } from 'react';

import { trackPageView } from './track-event.ts';

import type { Locale } from '@portfolio/content';

type PageViewTrackerProps = {
  locale: Locale;
};

export function PageViewTracker({ locale }: PageViewTrackerProps) {
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    const start = () => {
      if (cancelled) return;
      const schedule = () => trackPageView(locale);
      if (typeof requestIdleCallback === 'function') {
        const handle = requestIdleCallback(schedule, { timeout: 3000 });
        cleanup = () => cancelIdleCallback(handle);
      } else {
        const timeout = window.setTimeout(schedule, 0);
        cleanup = () => window.clearTimeout(timeout);
      }
    };
    void (window.__portfolioLocaleReady ?? Promise.resolve(true)).then((ready) => {
      if (ready) start();
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [locale]);

  return null;
}
