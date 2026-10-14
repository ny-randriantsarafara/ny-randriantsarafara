import { describe, expect, it } from 'vitest';

import {
  millisecondsUntilNextParisDaily,
  millisecondsUntilNextParisInterval,
} from './paris-schedule.ts';

describe('millisecondsUntilNextParisDaily', () => {
  it('returns zero when the clock is already on the Paris slot', () => {
    const clock = () => new Date('2026-10-14T01:30:00.000Z');
    expect(millisecondsUntilNextParisDaily(clock, 3, 30)).toBe(0);
  });

  it('waits until the next occurrence on the same Paris day', () => {
    const clock = () => new Date('2026-10-14T00:15:00.000Z');
    expect(millisecondsUntilNextParisDaily(clock, 3, 0)).toBe(45 * 60_000);
  });

  it('uses the hour after a missing spring-forward slot once', () => {
    const clock = () => new Date('2026-03-28T23:00:00.000Z');
    const delay = millisecondsUntilNextParisDaily(clock, 2, 30);
    const fireAt = new Date(clock().getTime() + delay);
    expect(fireAt.toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });
});

describe('millisecondsUntilNextParisInterval', () => {
  it('aligns to the next Paris minute divisible by the interval', () => {
    const clock = () => new Date('2026-10-14T10:03:00.000Z');
    expect(millisecondsUntilNextParisInterval(clock, 5)).toBe(2 * 60_000);
  });
});
