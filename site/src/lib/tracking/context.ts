import { readReferrerHostFromDocument } from './referrer-host.ts';

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
  const params = new URLSearchParams(window.location.search);
  return {
    path: window.location.pathname,
    locale,
    referrer:
      document.referrer.length > 0 ? readReferrerHostFromDocument(document.referrer) : undefined,
    utmSource: readParam(params, 'utm_source'),
    utmMedium: readParam(params, 'utm_medium'),
    utmCampaign: readParam(params, 'utm_campaign'),
  };
}

function readParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  if (value === null || value.length === 0) {
    return undefined;
  }
  return value;
}
