import { describe, expect, it } from 'vitest';

import { isAnalyticsIncluded } from './journey-event.ts';
import { journeyEventFromStoredEvent } from './stored-events.ts';

describe('stored audience events', () => {
  it('treats persisted events as always included because Task 1 drops excluded traffic before save', () => {
    const row = journeyEventFromStoredEvent({
      id: 'e1',
      journey_id: 'j1',
      type: 'page_view',
      occurred_at: '2026-01-10T10:00:00.000Z',
      received_at: '2026-01-10T10:00:01.000Z',
      request_id: 'r1',
    });
    expect(row.analytics_excluded).toBeNull();
    expect(isAnalyticsIncluded(row)).toBe(true);
  });
});
