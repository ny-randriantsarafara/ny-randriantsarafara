import type { JourneyEventRow } from './journey-event.ts';

/**
 * Task 1 rejects GPC/DNT/bot traffic in `api/src/events/events-service.ts` before `EventStore.save`,
 * so persisted `events` rows are always journey-eligible and never carry `analytics_excluded`.
 */
export function journeyEventFromStoredEvent(
  row: Omit<JourneyEventRow, 'analytics_excluded'>
): JourneyEventRow {
  return {
    ...row,
    analytics_excluded: null,
  };
}
