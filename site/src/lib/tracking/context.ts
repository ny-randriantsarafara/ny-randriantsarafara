import { readCurrentPath, readLandingAcquisition } from './journey-memory.ts';

import type { Locale } from '@portfolio/content';

export type TrackingContext = {
  path: string;
  locale: Locale;
  referrer: string | undefined;
  utmSource: string | undefined;
  utmMedium: string | undefined;
  utmCampaign: string | undefined;
};

export function readTrackingContext(locale: Locale): TrackingContext {
  if (typeof window === 'undefined') {
    return {
      path: '/',
      locale,
      referrer: undefined,
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
    };
  }
  const landing = readLandingAcquisition();
  return {
    path: readCurrentPath(),
    locale,
    referrer: landing.referrer,
    utmSource: landing.utmSource,
    utmMedium: landing.utmMedium,
    utmCampaign: landing.utmCampaign,
  };
}
