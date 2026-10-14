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

export type MemoryRateLimiterOptions = {
  clock: () => Date;
  maxKeys: number;
  sweepIntervalMilliseconds: number;
};

type CounterEntry = {
  count: number;
  expiresAtMilliseconds: number;
};

type LimiterState = {
  counters: Map<string, CounterEntry>;
  lastSweepAtMilliseconds: number;
};

const DEFAULT_MAX_KEYS = 50_000;
const DEFAULT_SWEEP_INTERVAL_MILLISECONDS = 60_000;

export function createMemoryRateLimiter(
  options: Partial<MemoryRateLimiterOptions> = {}
): MemoryRateLimiter {
  const clock = options.clock ?? (() => new Date());
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const sweepIntervalMilliseconds =
    options.sweepIntervalMilliseconds ?? DEFAULT_SWEEP_INTERVAL_MILLISECONDS;
  const state: LimiterState = {
    counters: new Map<string, CounterEntry>(),
    lastSweepAtMilliseconds: 0,
  };

  return {
    check(window: RateLimitWindow, nowMilliseconds: number): RateLimitResult {
      maybeSweepExpired(state, nowMilliseconds, sweepIntervalMilliseconds);
      const existing = state.counters.get(window.key);
      if (existing === undefined || existing.expiresAtMilliseconds <= nowMilliseconds) {
        state.counters.set(window.key, {
          count: 1,
          expiresAtMilliseconds: nowMilliseconds + window.windowMilliseconds,
        });
        enforceMaxKeys(state, maxKeys);
        return { allowed: true, remaining: window.limit - 1 };
      }
      if (existing.count >= window.limit) {
        return { allowed: false, remaining: 0 };
      }
      const updated: CounterEntry = {
        count: existing.count + 1,
        expiresAtMilliseconds: existing.expiresAtMilliseconds,
      };
      state.counters.set(window.key, updated);
      return { allowed: true, remaining: window.limit - updated.count };
    },
  };
}

function maybeSweepExpired(
  state: LimiterState,
  nowMilliseconds: number,
  sweepIntervalMilliseconds: number
): void {
  if (nowMilliseconds - state.lastSweepAtMilliseconds < sweepIntervalMilliseconds) {
    return;
  }
  state.lastSweepAtMilliseconds = nowMilliseconds;
  pruneExpired(state.counters, nowMilliseconds);
}

function pruneExpired(counters: Map<string, CounterEntry>, nowMilliseconds: number): void {
  for (const [key, entry] of counters) {
    if (entry.expiresAtMilliseconds <= nowMilliseconds) {
      counters.delete(key);
    }
  }
}

function enforceMaxKeys(state: LimiterState, maxKeys: number): void {
  if (state.counters.size <= maxKeys) {
    return;
  }
  const entries = [...state.counters.entries()].toSorted(
    (left, right) => left[1].expiresAtMilliseconds - right[1].expiresAtMilliseconds
  );
  const overflow = state.counters.size - maxKeys;
  entries.slice(0, overflow).forEach(([key]) => {
    state.counters.delete(key);
  });
}
