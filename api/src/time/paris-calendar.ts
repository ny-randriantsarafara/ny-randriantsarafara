import { z } from 'zod';

export type ParisCalendar = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const parisPartsSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
  hour: z.number().int(),
  minute: z.number().int(),
});

export function readParisCalendar(clock: () => Date): ParisCalendar {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(clock());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)])
  );
  return parisPartsSchema.parse({
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  });
}

export function parisDayKey(clock: () => Date): string {
  const calendar = readParisCalendar(clock);
  return `${calendar.year}-${String(calendar.month).padStart(2, '0')}-${String(calendar.day).padStart(2, '0')}`;
}

export function parisMonthKey(clock: () => Date): string {
  const calendar = readParisCalendar(clock);
  return `${calendar.year}-${String(calendar.month).padStart(2, '0')}`;
}

export function parisHourKey(clock: () => Date): string {
  const calendar = readParisCalendar(clock);
  return `${parisDayKey(clock)}T${String(calendar.hour).padStart(2, '0')}`;
}

export function listRecentParisDayKeys(clock: () => Date, count: number): string[] {
  if (count < 1) {
    throw new Error('count must be at least 1.');
  }
  return enumerateParisDays(parisDayKey(clock), count - 1, [parisDayKey(clock)]);
}

function enumerateParisDays(currentDay: string, remaining: number, collected: string[]): string[] {
  if (remaining === 0) {
    return collected;
  }
  const previousDay = shiftParisDayKey(currentDay, -1);
  return enumerateParisDays(previousDay, remaining - 1, [previousDay, ...collected]);
}

export function shiftParisDayKey(dayKey: string, dayOffset: number): string {
  const parts = parseParisDayKey(dayKey);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function parseParisDayKey(dayKey: string): ParisCalendar {
  const [yearText, monthText, dayText] = dayKey.split('-');
  const year = Number.parseInt(yearText ?? '', 10);
  const month = Number.parseInt(monthText ?? '', 10);
  const day = Number.parseInt(dayText ?? '', 10);
  return parisPartsSchema.parse({ year, month, day, hour: 0, minute: 0 });
}

export function parisDayUtcRange(dayKey: string): { startIso: string; endIso: string } {
  const start = resolveParisDayInstant(dayKey, 0, 0);
  if (start === null) {
    throw new Error(`Could not resolve the Paris day start for ${dayKey}.`);
  }
  const nextDay = shiftParisDayKey(dayKey, 1);
  const end = resolveParisDayInstant(nextDay, 0, 0);
  if (end === null) {
    throw new Error(`Could not resolve the Paris day end for ${dayKey}.`);
  }
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function resolveParisDayInstant(dayKey: string, hour: number, minute: number): Date | null {
  const parts = parseParisDayKey(dayKey);
  return scanParisDayInstant({ ...parts, hour, minute }, -12);
}

function scanParisDayInstant(calendar: ParisCalendar, hourOffset: number): Date | null {
  if (hourOffset > 36) {
    return null;
  }
  const candidate = new Date(
    Date.UTC(calendar.year, calendar.month - 1, calendar.day, hourOffset, calendar.minute, 0)
  );
  const probe = readParisCalendar(() => candidate);
  if (
    probe.year === calendar.year &&
    probe.month === calendar.month &&
    probe.day === calendar.day &&
    probe.hour === calendar.hour &&
    probe.minute === calendar.minute
  ) {
    return candidate;
  }
  return scanParisDayInstant(calendar, hourOffset + 1);
}

export function millisecondsUntilParisDayEnd(clock: () => Date): number {
  const startMilliseconds = clock().getTime();
  const startDay = parisDayKey(clock);
  return scanUntilParisDayEnd(startMilliseconds, startDay, 1);
}

function scanUntilParisDayEnd(
  startMilliseconds: number,
  startDay: string,
  minutesToAdd: number
): number {
  if (minutesToAdd > 48 * 60) {
    throw new Error('Could not resolve the Paris day end.');
  }
  const probeMilliseconds = startMilliseconds + minutesToAdd * 60_000;
  const probeDay = parisDayKey(() => new Date(probeMilliseconds));
  if (probeDay !== startDay) {
    return minutesToAdd * 60_000;
  }
  return scanUntilParisDayEnd(startMilliseconds, startDay, minutesToAdd + 1);
}

export function parisMonthStartIso(clock: () => Date): string {
  const calendar = readParisCalendar(clock);
  const resolved = scanParisMonthStart(calendar, -12);
  if (resolved === null) {
    throw new Error('Could not resolve the Paris month start.');
  }
  return resolved.toISOString();
}

function scanParisMonthStart(calendar: ParisCalendar, hourOffset: number): Date | null {
  if (hourOffset > 36) {
    return null;
  }
  const candidate = new Date(Date.UTC(calendar.year, calendar.month - 1, 1, hourOffset, 0, 0));
  const probe = readParisCalendar(() => candidate);
  if (
    probe.year === calendar.year &&
    probe.month === calendar.month &&
    probe.day === 1 &&
    probe.hour === 0
  ) {
    return candidate;
  }
  return scanParisMonthStart(calendar, hourOffset + 1);
}
