import { describe, expect, it } from 'vitest';

import { createMemoryRateLimiter } from './memory-rate-limiter.ts';

describe('createMemoryRateLimiter', () => {
  it('evicts expired entries on a periodic sweep', () => {
    const now = { value: 0 };
    const clock = () => new Date(now.value);
    const limiter = createMemoryRateLimiter({
      clock,
      sweepIntervalMilliseconds: 60_000,
      maxKeys: 50_000,
    });
    limiter.check({ key: 'a', limit: 1, windowMilliseconds: 1_000 }, 0);
    now.value = 120_000;
    limiter.check({ key: 'b', limit: 1, windowMilliseconds: 1_000 }, now.value);
    const reused = limiter.check({ key: 'a', limit: 1, windowMilliseconds: 1_000 }, now.value);
    expect(reused.allowed).toBe(true);
  });

  it('enforces a hard cap by evicting the soonest-expiring keys', () => {
    const limiter = createMemoryRateLimiter({ maxKeys: 2, sweepIntervalMilliseconds: 60_000 });
    limiter.check({ key: 'first', limit: 5, windowMilliseconds: 10_000 }, 0);
    limiter.check({ key: 'second', limit: 5, windowMilliseconds: 20_000 }, 0);
    limiter.check({ key: 'third', limit: 5, windowMilliseconds: 30_000 }, 0);
    const firstAgain = limiter.check({ key: 'first', limit: 5, windowMilliseconds: 10_000 }, 0);
    expect(firstAgain.allowed).toBe(true);
    expect(firstAgain.remaining).toBe(4);
  });
});
