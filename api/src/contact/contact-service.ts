import type { MemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { checkVisitorContactLimit } from '../rate-limit/chat-limits.ts';
import type { ContactNotifier } from './contact-notifier.ts';
import { contactRequestSchema } from './contact-request.ts';
import type { ContactStore } from './contact-store.ts';

const MIN_ELAPSED_MILLISECONDS = 3_000;

export type ContactServiceDependencies = {
  store: ContactStore;
  notifier: ContactNotifier;
  rateLimiter: MemoryRateLimiter;
  clock: () => Date;
};

export type ContactService = {
  handle(
    body: unknown,
    visitorKey: string
  ): Promise<{ status: number; body: { status: 'accepted' } | { error: string } }>;
};

export function createContactService(dependencies: ContactServiceDependencies): ContactService {
  return {
    handle: (body, visitorKey) => handleContact(body, visitorKey, dependencies),
  };
}

async function handleContact(
  body: unknown,
  visitorKey: string,
  dependencies: ContactServiceDependencies
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
