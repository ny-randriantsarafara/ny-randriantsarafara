import { readPerformanceMark, readPerformanceElapsedMs } from './performance-elapsed.ts';

export type EngagementTick = {
  durationMs: number;
};

export type EngagementSession = {
  startMark: number;
  lastSentMark: number;
};

export function startEngagementSession(): EngagementSession {
  const mark = readPerformanceMark();
  return { startMark: mark, lastSentMark: mark };
}

export function readEngagementSlice(
  session: EngagementSession,
  nowMark: number
): EngagementTick | null {
  if (document.visibilityState !== 'visible') {
    return null;
  }
  const durationMs = readPerformanceElapsedMs(session.lastSentMark);
  if (durationMs <= 0) {
    return null;
  }
  session.lastSentMark = nowMark;
  return { durationMs };
}

export function readEngagementUntilHidden(session: EngagementSession): EngagementTick | null {
  const durationMs = readPerformanceElapsedMs(session.lastSentMark);
  if (durationMs <= 0) {
    return null;
  }
  return { durationMs };
}
