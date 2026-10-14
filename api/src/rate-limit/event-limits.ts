import type { MemoryRateLimiter } from './memory-rate-limiter.ts';

const TEN_MINUTES = 10 * 60 * 1000;
const EVENT_LIMIT = 120;

export function checkVisitorEventLimit(
  limiter: MemoryRateLimiter,
  visitorHash: string,
  nowMilliseconds: number
): boolean {
  return limiter.check(
    { key: `events:10m:${visitorHash}`, limit: EVENT_LIMIT, windowMilliseconds: TEN_MINUTES },
    nowMilliseconds
  ).allowed;
}
