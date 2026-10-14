import { parisDayKey, readParisCalendar, type ParisCalendar } from '../time/paris-calendar.ts';

export type ParisClock = () => Date;

export function parisSlotKey(calendar: ParisCalendar): string {
  return `${calendar.year}-${String(calendar.month).padStart(2, '0')}-${String(calendar.day).padStart(2, '0')}T${String(calendar.hour).padStart(2, '0')}:${String(calendar.minute).padStart(2, '0')}`;
}

export function millisecondsUntilNextParisDaily(
  clock: ParisClock,
  hour: number,
  minute: number
): number {
  const startMilliseconds = clock().getTime();
  const startDay = parisDayKey(clock);
  return scanNextParisDaily(startMilliseconds, startDay, hour, minute, 0);
}

function scanNextParisDaily(
  startMilliseconds: number,
  startDay: string,
  hour: number,
  minute: number,
  minutesAdded: number
): number {
  if (minutesAdded > 48 * 60) {
    throw new Error('Could not resolve the next Paris daily schedule.');
  }
  const probeMilliseconds = startMilliseconds + minutesAdded * 60_000;
  const calendar = readParisCalendar(() => new Date(probeMilliseconds));
  if (calendar.hour === hour && calendar.minute === minute) {
    return minutesAdded * 60_000;
  }
  const probeDay = parisDayKey(() => new Date(probeMilliseconds));
  if (probeDay !== startDay && minutesAdded > 0) {
    const substitute = millisecondsUntilSpringForwardSubstitute(
      startMilliseconds,
      startDay,
      hour,
      minute
    );
    if (substitute !== null) {
      return substitute;
    }
  }
  return scanNextParisDaily(startMilliseconds, startDay, hour, minute, minutesAdded + 1);
}

function millisecondsUntilSpringForwardSubstitute(
  startMilliseconds: number,
  startDay: string,
  hour: number,
  minute: number
): number | null {
  if (hour !== 2) {
    return null;
  }
  return scanSpringForwardSubstitute(startMilliseconds, startDay, hour + 1, 0, 0);
}

function scanSpringForwardSubstitute(
  startMilliseconds: number,
  startDay: string,
  hour: number,
  minute: number,
  minutesAdded: number
): number | null {
  if (minutesAdded > 24 * 60) {
    return null;
  }
  const probeMilliseconds = startMilliseconds + minutesAdded * 60_000;
  const probeDay = parisDayKey(() => new Date(probeMilliseconds));
  if (probeDay !== startDay) {
    return null;
  }
  const calendar = readParisCalendar(() => new Date(probeMilliseconds));
  if (calendar.hour === hour && calendar.minute === minute) {
    return minutesAdded * 60_000;
  }
  return scanSpringForwardSubstitute(startMilliseconds, startDay, hour, minute, minutesAdded + 1);
}

export function millisecondsUntilNextParisInterval(
  clock: ParisClock,
  intervalMinutes: number
): number {
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 60) {
    throw new Error('intervalMinutes must be an integer between 1 and 60.');
  }
  const startMilliseconds = clock().getTime();
  return scanNextParisInterval(startMilliseconds, intervalMinutes, 0);
}

function scanNextParisInterval(
  startMilliseconds: number,
  intervalMinutes: number,
  minutesAdded: number
): number {
  if (minutesAdded > intervalMinutes + 120) {
    throw new Error('Could not resolve the next Paris interval schedule.');
  }
  const probeMilliseconds = startMilliseconds + minutesAdded * 60_000;
  const calendar = readParisCalendar(() => new Date(probeMilliseconds));
  if (calendar.minute % intervalMinutes !== 0) {
    return scanNextParisInterval(startMilliseconds, intervalMinutes, minutesAdded + 1);
  }
  return minutesAdded * 60_000;
}
