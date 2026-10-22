import { redactQuestion } from '../chat/redact-question.ts';
import type { MemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { checkVisitorEventLimit } from '../rate-limit/event-limits.ts';
import type { VisitorHasher } from '../visitor/visitor-hasher.ts';
import { isBotUserAgent } from './bot-user-agent.ts';
import { readDeviceClass } from './device-class.ts';
import { eventPayload, eventRequestSchema } from './event-request.ts';
import type { EventStore } from './event-store.ts';
import { readPrivacySignals, shouldDiscardForPrivacy } from './privacy-signals.ts';
import { readReferrerHost } from './referrer-host.ts';

export type EventsServiceDependencies = {
  store: EventStore;
  visitorHasher: VisitorHasher;
  rateLimiter: MemoryRateLimiter;
  clock: () => Date;
};

export type EventsService = {
  handle(input: EventsHandleInput): Promise<{ status: number }>;
};

export type EventsHandleInput = {
  body: unknown;
  userAgent: string;
  ipAddress: string;
  privacyHeaders: Headers;
};

export function createEventsService(dependencies: EventsServiceDependencies): EventsService {
  return {
    handle: (input) => handleEvent(input, dependencies),
  };
}

async function handleEvent(
  input: EventsHandleInput,
  dependencies: EventsServiceDependencies
): Promise<{ status: number }> {
  if (shouldDiscardForPrivacy(readPrivacySignals(input.privacyHeaders))) {
    return { status: 204 };
  }
  if (isBotUserAgent(input.userAgent)) {
    return { status: 204 };
  }
  const parsed = eventRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return { status: 400 };
  }
  const request = parsed.data;
  const visitorHash = await dependencies.visitorHasher.derive(input.ipAddress, input.userAgent);
  const allowed = checkVisitorEventLimit(
    dependencies.rateLimiter,
    visitorHash,
    dependencies.clock().getTime()
  );
  if (!allowed) {
    return { status: 204 };
  }
  const payload = eventPayload(request);
  void dependencies.store.save({
    eventId: request.eventId,
    journeyId: request.journeyId,
    requestId: request.requestId,
    conversationId: request.conversationId,
    occurredAt: request.occurredAt ?? null,
    receivedAt: dependencies.clock().toISOString(),
    type: request.type,
    path: redactQuestion(request.path.split(/[?#]/)[0] ?? '/'),
    locale: request.locale,
    referrerHost: readReferrerHost(request.referrer),
    utmSource: request.utm_source === undefined ? null : redactQuestion(request.utm_source),
    utmMedium: request.utm_medium === undefined ? null : redactQuestion(request.utm_medium),
    utmCampaign: request.utm_campaign === undefined ? null : redactQuestion(request.utm_campaign),
    deviceClass: readDeviceClass(input.userAgent),
    visitorHash,
    payload,
  });
  return { status: 204 };
}
