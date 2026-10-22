import type { EventStore } from '../events/event-store.ts';
import type { ChatTelemetryContext } from '../chat/chat-service.ts';
import type { MemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { checkVisitorContactLimit } from '../rate-limit/chat-limits.ts';
import type { ContactNotifier } from './contact-notifier.ts';
import { contactRequestSchema } from './contact-request.ts';
import type { ContactStore } from './contact-store.ts';

const MIN_ELAPSED_MILLISECONDS = 3_000;

export type ContactServiceDependencies = {
  store: ContactStore;
  eventStore?: EventStore;
  notifier: ContactNotifier;
  rateLimiter: MemoryRateLimiter;
  clock: () => Date;
};

export type ContactService = {
  handle(
    body: unknown,
    visitorKey: string,
    telemetry?: ChatTelemetryContext
  ): Promise<{ status: number; body: { status: 'accepted' } | { error: string } }>;
};

export function createContactService(dependencies: ContactServiceDependencies): ContactService {
  return {
    handle: (body, visitorKey, telemetry = {}) =>
      handleContact(body, visitorKey, dependencies, telemetry),
  };
}

async function handleContact(
  body: unknown,
  visitorKey: string,
  dependencies: ContactServiceDependencies,
  telemetry: ChatTelemetryContext
): Promise<{ status: number; body: { status: 'accepted' } | { error: string } }> {
  const spamSignals = readSpamSignals(body);
  if (spamSignals !== null && (spamSignals.websiteFilled || spamSignals.tooFast)) {
    return { status: 200, body: { status: 'accepted' } };
  }
  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: 'invalid_request' } };
  }
  const request = parsed.data;
  const allowed = checkVisitorContactLimit(
    dependencies.rateLimiter,
    visitorKey,
    dependencies.clock().getTime()
  );
  if (!allowed) {
    return { status: 429, body: { error: 'rate_limited' } };
  }
  await dependencies.store.save(request);
  if (telemetry.analyticsExcluded !== true)
    void dependencies.eventStore?.save({
      type: 'contact_stored',
      path: '/',
      locale: request.locale,
      requestId: request.requestId,
      journeyId: request.journeyId,
      conversationId: request.conversationId,
      receivedAt: dependencies.clock().toISOString(),
      occurredAt: null,
      visitorHash: visitorKey,
      deviceClass: telemetry.deviceClass ?? 'desktop',
      referrerHost: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      payload: null,
    });
  void dependencies.notifier.notify(request);
  return { status: 200, body: { status: 'accepted' } };
}

function readSpamSignals(body: unknown): { websiteFilled: boolean; tooFast: boolean } | null {
  if (!isRecord(body)) {
    return null;
  }
  const website = body.website;
  const elapsed = body.elapsedMilliseconds;
  const websiteFilled = typeof website === 'string' && website.length > 0;
  const tooFast =
    typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed < MIN_ELAPSED_MILLISECONDS;
  return { websiteFilled, tooFast };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
