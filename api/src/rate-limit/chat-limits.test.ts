import { describe, expect, it } from 'vitest';

import { parisDayKey } from '../time/paris-calendar.ts';
import { checkGlobalModelDailyLimit, checkVisitorChatLimits } from './chat-limits.ts';
import { createMemoryRateLimiter } from './memory-rate-limiter.ts';

describe('checkVisitorChatLimits', () => {
  it('allows fifteen messages within ten minutes then refuses the sixteenth', () => {
    const limiter = createMemoryRateLimiter();
    const visitorKey = 'visitor-a';
    Array.from({ length: 15 }, (_, index) => index).forEach((index) => {
      const result = checkVisitorChatLimits(limiter, visitorKey, index);
      expect(result.visitorExceeded).toBe(false);
    });
    const blocked = checkVisitorChatLimits(limiter, visitorKey, 15);
    expect(blocked.visitorExceeded).toBe(true);
  });
});

describe('checkGlobalModelDailyLimit', () => {
  it('resets when the Paris calendar day changes', () => {
    const limiter = createMemoryRateLimiter();
    const lateNight = () => new Date('2026-10-14T21:30:00.000Z');
    const afterMidnight = () => new Date('2026-10-14T22:30:00.000Z');
    expect(parisDayKey(lateNight)).not.toBe(parisDayKey(afterMidnight));
    expect(checkGlobalModelDailyLimit(limiter, lateNight, 1, lateNight().getTime())).toBe(true);
    expect(checkGlobalModelDailyLimit(limiter, lateNight, 1, lateNight().getTime() + 1)).toBe(
      false
    );
    expect(checkGlobalModelDailyLimit(limiter, afterMidnight, 1, afterMidnight().getTime())).toBe(
      true
    );
  });
});
