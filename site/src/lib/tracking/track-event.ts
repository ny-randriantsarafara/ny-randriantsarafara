import { sendEventBeacon } from './beacon.ts';
import { readTrackingContext, type TrackingContext } from './context.ts';

import type { Locale } from '@portfolio/content';

type BaseFields = {
  path: string;
  locale: Locale;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

function baseFields(context: TrackingContext): BaseFields {
  return {
    path: context.path,
    locale: context.locale,
    referrer: context.referrer,
    utm_source: context.utmSource,
    utm_medium: context.utmMedium,
    utm_campaign: context.utmCampaign,
  };
}

export function trackPageView(locale: Locale): void {
  sendEventBeacon({ type: 'page_view', ...baseFields(readTrackingContext(locale)) });
}

export function trackQuickViewOpen(locale: Locale): void {
  sendEventBeacon({ type: 'quick_view_open', ...baseFields(readTrackingContext(locale)) });
}

export function trackBlockView(
  locale: Locale,
  blockType: string,
  identifier: string | undefined
): void {
  const payload: Record<string, string | undefined> = {
    type: 'block_view',
    blockType,
    ...baseFields(readTrackingContext(locale)),
  };
  if (identifier !== undefined) {
    payload.identifier = identifier;
  }
  sendEventBeacon(payload);
}

export function trackSuggestionClick(locale: Locale): void {
  sendEventBeacon({ type: 'suggestion_click', ...baseFields(readTrackingContext(locale)) });
}

export function trackCvDownload(locale: Locale): void {
  sendEventBeacon({ type: 'cv_download', ...baseFields(readTrackingContext(locale)) });
}

export type ContactChannel = 'email' | 'linkedin' | 'github' | 'form';

export function trackContactClick(locale: Locale, channel: ContactChannel): void {
  sendEventBeacon({
    type: 'contact_click',
    channel,
    ...baseFields(readTrackingContext(locale)),
  });
}

export function trackContactSubmit(locale: Locale): void {
  sendEventBeacon({ type: 'contact_submit', ...baseFields(readTrackingContext(locale)) });
}

export function trackLocaleSwitch(fromLocale: Locale, to: Locale): void {
  const context = readTrackingContext(fromLocale);
  sendEventBeacon({
    type: 'locale_switch',
    to,
    ...baseFields(context),
  });
}
