export type RateLimitWindow = {
  key: string;
  limit: number;
  windowMilliseconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export type MemoryRateLimiter = {
  check(window: RateLimitWindow, nowMilliseconds: number): RateLimitResult;
};

type CounterEntry = {
  count: number;
  expiresAtMilliseconds: number;
};

export function createMemoryRateLimiter(): MemoryRateLimiter {
  const counters = new Map<string, CounterEntry>();

  return {
    check(window: RateLimitWindow, nowMilliseconds: number): RateLimitResult {
      pruneExpired(counters, nowMilliseconds);
      const existing = counters.get(window.key);
      if (existing === undefined || existing.expiresAtMilliseconds <= nowMilliseconds) {
        counters.set(window.key, {
          count: 1,
          expiresAtMilliseconds: nowMilliseconds + window.windowMilliseconds,
        });
        return { allowed: true, remaining: window.limit - 1 };
      }
      if (existing.count >= window.limit) {
        return { allowed: false, remaining: 0 };
      }
      existing.count += 1;
      return { allowed: true, remaining: window.limit - existing.count };
    },
  };
}

function pruneExpired(counters: Map<string, CounterEntry>, nowMilliseconds: number): void {
  for (const [key, entry] of counters) {
    if (entry.expiresAtMilliseconds <= nowMilliseconds) {
      counters.delete(key);
    }
  }
}
