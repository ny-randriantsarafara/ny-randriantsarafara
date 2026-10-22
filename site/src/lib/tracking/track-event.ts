import { sendEventBeacon } from './beacon.ts';
import {
  chatDeliveryEmissionGuard,
  mapTransportFailure,
  readRenderMode,
  truncateFallbackText,
  type ChatCancelReason,
  type ChatFailureReason,
} from './chat-delivery.ts';
import {
  readContentBlockType,
  readContentIdentifier,
  type ContentBlockType,
} from './content-block-type.ts';
import { readTrackingContext } from './context.ts';
import { buildCorrelationFields } from './journey-memory.ts';
import { readPerformanceElapsedMs } from './performance-elapsed.ts';

import type { WireEventBody } from './wire-event.ts';
import type { ChatTransportFailure } from '@/lib/chat/send-chat-message.ts';
import type { ChatMode } from '@portfolio/chat';
import type { Locale } from '@portfolio/content';

type BaseFields = {
  path: string;
  locale: Locale;
  journeyId: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  conversationId?: string;
  requestId?: string;
  occurredAt?: string;
};

function baseFields(
  locale: Locale,
  options?: { conversationId?: string; requestId?: string }
): BaseFields {
  return buildCorrelationFields(locale, options);
}

function sendTypedEvent(payload: WireEventBody): void {
  sendEventBeacon({ ...payload, occurredAt: new Date().toISOString() });
}

export function trackPageView(locale: Locale, conversationId?: string): void {
  sendTypedEvent({
    type: 'page_view',
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export function trackQuickViewOpen(locale: Locale, conversationId?: string): void {
  sendTypedEvent({
    type: 'quick_view_open',
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export function trackBlockView(
  locale: Locale,
  blockType: string,
  identifier: string | undefined,
  conversationId?: string
): void {
  const payload: WireEventBody = {
    type: 'block_view',
    blockType,
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
    ...(identifier !== undefined ? { identifier } : {}),
  };
  sendTypedEvent(payload);
}

export function trackContentImpression(
  locale: Locale,
  blockType: ContentBlockType,
  identifier: string | undefined,
  conversationId: string
): void {
  const payload: WireEventBody = {
    type: 'content_impression',
    blockType,
    ...baseFields(locale, { conversationId }),
    ...(identifier !== undefined ? { identifier } : {}),
  };
  sendTypedEvent(payload);
}

export function trackContentClick(
  locale: Locale,
  blockType: ContentBlockType,
  identifier: string | undefined,
  conversationId?: string
): void {
  const payload: WireEventBody = {
    type: 'content_click',
    blockType,
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
    ...(identifier !== undefined ? { identifier } : {}),
  };
  sendTypedEvent(payload);
}

export function trackEngagement(locale: Locale, durationMs: number, conversationId?: string): void {
  sendTypedEvent({
    type: 'engagement',
    durationMs,
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export function trackSuggestionClick(locale: Locale, conversationId?: string): void {
  sendTypedEvent({
    type: 'suggestion_click',
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export function trackCvDownload(locale: Locale, conversationId?: string): void {
  sendTypedEvent({
    type: 'cv_download',
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export function trackCvClick(locale: Locale, conversationId?: string): void {
  sendTypedEvent({
    type: 'cv_click',
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export type ContactChannel = 'email' | 'linkedin' | 'github' | 'form';

export function trackContactClick(
  locale: Locale,
  channel: ContactChannel,
  conversationId?: string
): void {
  sendTypedEvent({
    type: 'contact_click',
    channel,
    ...baseFields(locale, conversationId !== undefined ? { conversationId } : undefined),
  });
}

export function trackContactSubmit(
  locale: Locale,
  conversationId?: string,
  requestId?: string
): void {
  const correlation =
    conversationId !== undefined || requestId !== undefined
      ? { conversationId, requestId }
      : undefined;
  sendTypedEvent({
    type: 'contact_submit',
    ...baseFields(locale, correlation),
  });
}

export function trackLocaleSwitch(fromLocale: Locale, to: Locale, conversationId?: string): void {
  const context = readTrackingContext(fromLocale);
  sendTypedEvent({
    type: 'locale_switch',
    to,
    path: context.path,
    locale: fromLocale,
    journeyId: buildCorrelationFields(fromLocale).journeyId,
    referrer: context.referrer,
    utm_source: context.utmSource,
    utm_medium: context.utmMedium,
    utm_campaign: context.utmCampaign,
    ...(conversationId !== undefined ? { conversationId } : {}),
  });
}

export function trackChatSubmitted(
  locale: Locale,
  conversationId: string,
  requestId: string
): void {
  if (!chatDeliveryEmissionGuard.shouldEmit(requestId, 'submitted')) {
    return;
  }
  sendTypedEvent({
    type: 'chat_submitted',
    ...baseFields(locale, { conversationId, requestId }),
  });
}

export function trackChatRendered(
  locale: Locale,
  conversationId: string,
  requestId: string,
  startMark: number,
  apiMode: ChatMode | null,
  usedFallback: boolean
): void {
  if (!chatDeliveryEmissionGuard.shouldEmit(requestId, 'rendered')) {
    return;
  }
  sendTypedEvent({
    type: 'chat_rendered',
    mode: readRenderMode(apiMode, usedFallback),
    durationMs: readPerformanceElapsedMs(startMark),
    ...baseFields(locale, { conversationId, requestId }),
  });
}

export function trackChatFailed(
  locale: Locale,
  conversationId: string,
  requestId: string,
  reason: ChatFailureReason
): void {
  if (!chatDeliveryEmissionGuard.shouldEmit(requestId, 'failed')) {
    return;
  }
  sendTypedEvent({
    type: 'chat_failed',
    reason,
    ...baseFields(locale, { conversationId, requestId }),
  });
}

export function trackChatCancelled(
  locale: Locale,
  conversationId: string,
  requestId: string,
  reason: ChatCancelReason
): void {
  if (!chatDeliveryEmissionGuard.shouldEmit(requestId, 'cancelled')) {
    return;
  }
  sendTypedEvent({
    type: 'chat_cancelled',
    reason,
    ...baseFields(locale, { conversationId, requestId }),
  });
}

export function trackChatLocalFallback(
  locale: Locale,
  conversationId: string,
  requestId: string,
  failure: ChatTransportFailure,
  text: string,
  startMark: number
): void {
  if (!chatDeliveryEmissionGuard.shouldEmit(requestId, 'local_fallback')) {
    return;
  }
  const reason = mapTransportFailure(failure);
  sendTypedEvent({
    type: 'chat_local_fallback',
    reason,
    text: truncateFallbackText(text),
    durationMs: readPerformanceElapsedMs(startMark),
    ...baseFields(locale, { conversationId, requestId }),
  });
}

export { readContentBlockType, readContentIdentifier };
