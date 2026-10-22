'use client';

import { useEffect, useRef } from 'react';

import { trackChatRendered } from '@/lib/tracking/track-event.ts';

import type { ChatMode } from '@portfolio/chat';
import type { Locale } from '@portfolio/content';

type AssistantRenderTrackerProps = {
  locale: Locale;
  conversationId: string;
  requestId: string;
  startMark: number;
  apiMode: ChatMode | null;
  usedFallback: boolean;
};

export function AssistantRenderTracker({
  locale,
  conversationId,
  requestId,
  startMark,
  apiMode,
  usedFallback,
}: AssistantRenderTrackerProps) {
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) {
      return;
    }
    reportedRef.current = true;
    trackChatRendered(locale, conversationId, requestId, startMark, apiMode, usedFallback);
  }, [apiMode, conversationId, locale, requestId, startMark, usedFallback]);

  return null;
}
