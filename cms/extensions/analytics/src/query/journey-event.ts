import type { EventType } from '@portfolio/cms-schema';

export type JourneyEventRow = {
  id: string;
  journey_id: string | null;
  type: EventType | null;
  occurred_at: string | null;
  received_at: string | null;
  request_id: string | null;
  analytics_excluded?: boolean | null;
};

export function eventSortKey(row: JourneyEventRow): string {
  if (row.occurred_at !== null && row.occurred_at !== '') {
    return row.occurred_at;
  }
  if (row.received_at !== null && row.received_at !== '') {
    return row.received_at;
  }
  return row.id;
}

/** Exchanges/generations may set `analytics_excluded`; stored `events` rows do not (see `stored-events.ts`). */
export function isAnalyticsIncluded(row: JourneyEventRow): boolean {
  return row.analytics_excluded !== true;
}
