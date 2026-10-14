import type { MemoryRateLimiter, RateLimitWindow } from './memory-rate-limiter.ts';

export type ChatRateLimits = {
  visitorExceeded: boolean;
};

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export function checkVisitorChatLimits(
  limiter: MemoryRateLimiter,
  visitorKey: string,
  nowMilliseconds: number
): ChatRateLimits {
  const tenMinute = limiter.check(
    window(`chat:10m:${visitorKey}`, 15, TEN_MINUTES),
    nowMilliseconds
  );
  if (!tenMinute.allowed) {
    return { visitorExceeded: true };
  }
  const daily = limiter.check(window(`chat:day:${visitorKey}`, 60, ONE_DAY), nowMilliseconds);
  return { visitorExceeded: !daily.allowed };
}

export function checkVisitorContactLimit(
  limiter: MemoryRateLimiter,
  visitorKey: string,
  nowMilliseconds: number
): boolean {
  return limiter.check(window(`contact:hour:${visitorKey}`, 3, ONE_HOUR), nowMilliseconds).allowed;
}

export function checkGlobalModelDailyLimit(
  limiter: MemoryRateLimiter,
  parisDayKey: string,
  dailyLimit: number,
  nowMilliseconds: number
): boolean {
  return limiter.check(window(`model:day:${parisDayKey}`, dailyLimit, ONE_DAY), nowMilliseconds)
    .allowed;
}

function window(key: string, limit: number, windowMilliseconds: number): RateLimitWindow {
  return { key, limit, windowMilliseconds };
}
