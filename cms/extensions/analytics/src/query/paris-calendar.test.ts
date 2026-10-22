import { describe, expect, it } from 'vitest';

import {
  addParisDays,
  defaultReportingWindow,
  formatParisDate,
  listInclusiveParisDays,
  parisDayBounds,
  parisLocalHour,
  shouldRunRetention,
  shouldRunRollup,
  subtractParisCalendarMonths,
} from './paris-calendar.ts';

describe('Europe/Paris reporting boundaries', () => {
  it('maps UTC instants to Paris calendar days across DST start', () => {
    expect(formatParisDate(new Date('2026-03-28T23:30:00.000Z'))).toBe('2026-03-29');
    expect(formatParisDate(new Date('2026-03-29T00:30:00.000Z'))).toBe('2026-03-29');
  });

  it('builds day bounds that cover the full Paris day', () => {
    const winter = parisDayBounds('2026-01-15');
    expect(winter.startUtc).toBe('2026-01-14T23:00:00.000Z');
    expect(winter.endUtc).toBe('2026-01-15T23:00:00.000Z');

    const summer = parisDayBounds('2026-07-15');
    expect(summer.startUtc).toBe('2026-07-14T22:00:00.000Z');
    expect(summer.endUtc).toBe('2026-07-15T22:00:00.000Z');
  });

  it('steps Paris days across month boundaries', () => {
    expect(addParisDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addParisDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('returns equal-length previous period windows', () => {
    const window = defaultReportingWindow(new Date('2026-04-02T12:00:00.000Z'), 30);
    expect(window.days).toBe(30);
    expect(window.current.startUtc < window.current.endExclusiveUtc).toBe(true);
    expect(window.previous.startUtc < window.previous.endExclusiveUtc).toBe(true);
    expect(window.previous.endExclusiveUtc).toBe(window.current.startUtc);
  });

  it('reads the Paris local hour for job scheduling', () => {
    expect(parisLocalHour(new Date('2026-01-15T02:30:00.000Z'))).toBe(3);
    expect(parisLocalHour(new Date('2026-07-15T01:30:00.000Z'))).toBe(3);
  });

  it('subtracts Paris calendar months with month-end clamping', () => {
    expect(subtractParisCalendarMonths('2026-03-31', 1)).toBe('2026-02-28');
    expect(subtractParisCalendarMonths('2026-04-15', 13)).toBe('2025-03-15');
  });

  it('lists inclusive Paris day ranges for catch-up', () => {
    expect(listInclusiveParisDays('2026-01-30', '2026-02-01')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
    ]);
    expect(listInclusiveParisDays('2026-02-02', '2026-02-01')).toEqual([]);
  });

  it('gates rollup and retention by Paris local time', () => {
    expect(shouldRunRollup(new Date('2026-01-15T02:29:00.000Z'))).toBe(false);
    expect(shouldRunRollup(new Date('2026-01-15T02:30:00.000Z'))).toBe(true);
    expect(shouldRunRetention(new Date('2026-01-15T02:59:00.000Z'))).toBe(false);
    expect(shouldRunRetention(new Date('2026-01-15T03:00:00.000Z'))).toBe(true);
  });
});
