import { readReferrerHostFromDocument } from './referrer-host.ts';

import type { Locale } from '@portfolio/content';

export type LandingAcquisition = {
  referrer: string | undefined;
  utmSource: string | undefined;
  utmMedium: string | undefined;
  utmCampaign: string | undefined;
};

type JourneyMemory = {
  journeyId: string;
  landing: LandingAcquisition;
};

let memory: JourneyMemory | undefined;

function readParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  if (value === null || value.length === 0) {
    return undefined;
  }
  return value;
}

function captureLanding(): LandingAcquisition {
  if (typeof window === 'undefined') {
    return {
      referrer: undefined,
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const referrer =
    document.referrer.length > 0 ? readReferrerHostFromDocument(document.referrer) : undefined;
  return {
    referrer,
    utmSource: readParam(params, 'utm_source'),
    utmMedium: readParam(params, 'utm_medium'),
    utmCampaign: readParam(params, 'utm_campaign'),
  };
}

export function readJourneyId(): string {
  if (memory === undefined) {
    memory = {
      journeyId: crypto.randomUUID(),
      landing: captureLanding(),
    };
  }
  return memory.journeyId;
}

export function readLandingAcquisition(): LandingAcquisition {
  readJourneyId();
  if (memory === undefined) {
    return captureLanding();
  }
  return memory.landing;
}

export function readCurrentPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname;
}

export function resetJourneyMemoryForTests(): void {
  memory = undefined;
}

export type CorrelationFields = {
  journeyId: string;
  path: string;
  locale: Locale;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  conversationId?: string;
  requestId?: string;
};

export function buildCorrelationFields(
  locale: Locale,
  options?: { conversationId?: string; requestId?: string }
): CorrelationFields {
  const landing = readLandingAcquisition();
  const fields: CorrelationFields = {
    journeyId: readJourneyId(),
    path: readCurrentPath(),
    locale,
    referrer: landing.referrer,
    utm_source: landing.utmSource,
    utm_medium: landing.utmMedium,
    utm_campaign: landing.utmCampaign,
  };
  if (options?.conversationId !== undefined) {
    fields.conversationId = options.conversationId;
  }
  if (options?.requestId !== undefined) {
    fields.requestId = options.requestId;
  }
  return fields;
}
