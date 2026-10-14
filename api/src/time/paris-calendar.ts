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
