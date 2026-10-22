const PARIS = 'Europe/Paris';

export type ParisDayBounds = {
  day: string;
  startUtc: string;
  endUtc: string;
};

export type ReportingWindow = {
  days: number;
  current: { startUtc: string; endExclusiveUtc: string };
  previous: { startUtc: string; endExclusiveUtc: string };
};

export function parisDayBounds(day: string): ParisDayBounds {
  const startUtc = zonedTimeToUtc(`${day}T00:00:00`, PARIS);
  const nextDay = addParisDays(day, 1);
  const endUtc = zonedTimeToUtc(`${nextDay}T00:00:00`, PARIS);
  return { day, startUtc, endUtc };
}

export function parisDayForInstant(iso: string, now: Date = new Date()): string {
  void now;
  return formatParisDate(new Date(iso));
}

export function addParisDays(day: string, offset: number): string {
  const noonUtc = zonedTimeToUtc(`${day}T12:00:00`, PARIS);
  const shifted = new Date(new Date(noonUtc).getTime() + offset * 86_400_000);
  return formatParisDate(shifted);
}

export function defaultReportingWindow(reference: Date, dayCount: number): ReportingWindow {
  const endDay = addParisDays(formatParisDate(reference), -1);
  const startDay = addParisDays(endDay, -(dayCount - 1));
  const previousEndDay = addParisDays(startDay, -1);
  const previousStartDay = addParisDays(previousEndDay, -(dayCount - 1));

  const currentStart = parisDayBounds(startDay).startUtc;
  const currentEnd = parisDayBounds(addParisDays(endDay, 1)).startUtc;
  const previousStart = parisDayBounds(previousStartDay).startUtc;
  const previousEnd = parisDayBounds(addParisDays(previousEndDay, 1)).startUtc;

  return {
    days: dayCount,
    current: { startUtc: currentStart, endExclusiveUtc: currentEnd },
    previous: { startUtc: previousStart, endExclusiveUtc: previousEnd },
  };
}

export function closedParisDaysThrough(reference: Date, throughDay: string): string[] {
  const todayParis = formatParisDate(reference);
  if (throughDay > todayParis) {
    return [];
  }
  const days: string[] = [];
  let cursor = throughDay;
  const limit = addParisDays(todayParis, -400);
  while (cursor >= limit) {
    days.push(cursor);
    if (cursor === limit) {
      break;
    }
    cursor = addParisDays(cursor, -1);
  }
  return days;
}

export function formatParisDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = readPart(parts, 'year');
  const month = readPart(parts, 'month');
  const day = readPart(parts, 'day');
  return `${year}-${month}-${day}`;
}

export function subtractParisCalendarMonths(day: string, months: number): string {
  const [yearText, monthText, dayText] = day.split('-');
  const year = Number.parseInt(yearText ?? '', 10);
  const month = Number.parseInt(monthText ?? '', 10);
  const dayOfMonth = Number.parseInt(dayText ?? '', 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(dayOfMonth)) {
    throw new Error(`Invalid Paris day "${day}".`);
  }

  let targetYear = year;
  let targetMonth = month - months;
  while (targetMonth <= 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(dayOfMonth, lastDayOfTargetMonth);
  const monthLabel = String(targetMonth).padStart(2, '0');
  const dayLabel = String(clampedDay).padStart(2, '0');
  return `${targetYear}-${monthLabel}-${dayLabel}`;
}

export function listInclusiveParisDays(startDay: string, endDay: string): string[] {
  if (startDay > endDay) {
    return [];
  }
  const days: string[] = [];
  let cursor = startDay;
  while (true) {
    days.push(cursor);
    if (cursor === endDay) {
      break;
    }
    cursor = addParisDays(cursor, 1);
  }
  return days;
}

export function shouldRunRollup(reference: Date): boolean {
  const hour = parisLocalHour(reference);
  const minute = reference.getUTCMinutes();
  if (hour > 3) {
    return true;
  }
  if (hour === 3 && minute >= 30) {
    return true;
  }
  return false;
}

export function shouldRunRetention(reference: Date): boolean {
  return parisLocalHour(reference) >= 4;
}

export function parisLocalHour(reference: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(reference);
  const hour = readPart(parts, 'hour');
  return Number.parseInt(hour, 10);
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const match = parts.find((part) => part.type === type);
  if (match === undefined || match.value === '') {
    throw new Error(`Missing ${type} in Paris calendar formatting.`);
  }
  return match.value;
}

function zonedTimeToUtc(localIsoWithoutZone: string, timeZone: string): string {
  const [datePart, timePart] = localIsoWithoutZone.split('T');
  if (datePart === undefined || timePart === undefined) {
    throw new Error(`Invalid local timestamp "${localIsoWithoutZone}".`);
  }
  const [yearText, monthText, dayText] = datePart.split('-');
  const [hourText, minuteText, secondText] = timePart.split(':');
  const year = Number.parseInt(yearText ?? '', 10);
  const month = Number.parseInt(monthText ?? '', 10);
  const day = Number.parseInt(dayText ?? '', 10);
  const hour = Number.parseInt(hourText ?? '', 10);
  const minute = Number.parseInt(minuteText ?? '', 10);
  const second = Number.parseInt(secondText ?? '0', 10);
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = timezoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60_000).toISOString();
}

function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const zone = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = zone.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (match === null) {
    return 0;
  }
  const hours = Number.parseInt(match[1] ?? '0', 10);
  const minutes = Number.parseInt(match[2] ?? '0', 10);
  return hours * 60 + Math.sign(hours) * minutes;
}
