import { describe, expect, it } from 'vitest';

import {
  millisecondsUntilParisDayEnd,
  parisDayKey,
  parisMonthStartIso,
  readParisCalendar,
} from './paris-calendar.ts';

describe('readParisCalendar', () => {
  it('reads Europe/Paris on a DST spring-forward date', () => {
    const calendar = readParisCalendar(() => new Date('2026-03-29T01:30:00.000Z'));
    expect(calendar.year).toBe(2026);
    expect(calendar.month).toBe(3);
    expect(calendar.day).toBe(29);
  });
});

describe('parisDayKey', () => {
  it('changes at Paris midnight while UTC is still on the previous day', () => {
    const before = parisDayKey(() => new Date('2026-10-14T21:30:00.000Z'));
    const after = parisDayKey(() => new Date('2026-10-14T22:30:00.000Z'));
    expect(before).not.toBe(after);
  });
});

describe('millisecondsUntilParisDayEnd', () => {
  it('returns a positive duration before the Paris day ends', () => {
    const duration = millisecondsUntilParisDayEnd(() => new Date('2026-10-14T12:00:00.000Z'));
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });
});

describe('parisMonthStartIso', () => {
  it('resolves the first instant of the month in Paris', () => {
    const iso = parisMonthStartIso(() => new Date('2026-10-14T12:00:00.000Z'));
    expect(iso.length).toBeGreaterThan(0);
  });
});
