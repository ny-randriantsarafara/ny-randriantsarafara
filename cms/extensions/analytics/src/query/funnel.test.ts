import { describe, expect, it } from 'vitest';

import type { JourneyEventRow } from './journey-event.ts';
import { countCvLinkClicks, countOrderedFunnel, defaultJourneyFunnelSteps } from './funnel.ts';

function event(
  partial: Partial<JourneyEventRow> & Pick<JourneyEventRow, 'id' | 'journey_id' | 'type'>
): JourneyEventRow {
  return {
    occurred_at: null,
    received_at: null,
    request_id: null,
    analytics_excluded: false,
    ...partial,
  };
}

describe('ordered journey funnel', () => {
  const steps = defaultJourneyFunnelSteps;

  it('counts only journeys with events in order', () => {
    const rows: JourneyEventRow[] = [
      event({
        id: '1',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:00:00.000Z',
      }),
      event({
        id: '2',
        journey_id: 'j-a',
        type: 'chat_submitted',
        occurred_at: '2026-01-10T10:01:00.000Z',
      }),
      event({
        id: '3',
        journey_id: 'j-a',
        type: 'chat_rendered',
        occurred_at: '2026-01-10T10:01:05.000Z',
      }),
      event({
        id: '4',
        journey_id: 'j-b',
        type: 'page_view',
        occurred_at: '2026-01-10T11:00:00.000Z',
      }),
      event({
        id: '5',
        journey_id: 'j-b',
        type: 'chat_rendered',
        occurred_at: '2026-01-10T11:01:00.000Z',
      }),
    ];

    const result = countOrderedFunnel(rows, steps);
    expect(result.entered).toBe(2);
    expect(result.steps[0]?.count).toBe(2);
    expect(result.steps[1]?.count).toBe(1);
    expect(result.steps[2]?.count).toBe(1);
  });

  it('ignores out-of-order steps within a journey', () => {
    const rows: JourneyEventRow[] = [
      event({
        id: '1',
        journey_id: 'j-a',
        type: 'chat_submitted',
        occurred_at: '2026-01-10T10:01:00.000Z',
      }),
      event({
        id: '2',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:02:00.000Z',
      }),
    ];

    const result = countOrderedFunnel(rows, steps);
    expect(result.steps[0]?.count).toBe(1);
    expect(result.steps[1]?.count).toBe(0);
  });

  it('deduplicates cv_click and cv_download in the same journey for the CV step', () => {
    const rows: JourneyEventRow[] = [
      event({
        id: '1',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:00:00.000Z',
      }),
      event({
        id: '2',
        journey_id: 'j-a',
        type: 'cv_click',
        occurred_at: '2026-01-10T10:05:00.000Z',
      }),
      event({
        id: '3',
        journey_id: 'j-a',
        type: 'cv_download',
        occurred_at: '2026-01-10T10:05:00.001Z',
      }),
    ];

    expect(countCvLinkClicks(rows)).toBe(1);
  });

  it('uses contact_stored rather than contact_submit for stored conversion', () => {
    const rows: JourneyEventRow[] = [
      event({
        id: '1',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:00:00.000Z',
      }),
      event({
        id: '2',
        journey_id: 'j-a',
        type: 'contact_submit',
        occurred_at: '2026-01-10T10:05:00.000Z',
      }),
      event({
        id: '3',
        journey_id: 'j-b',
        type: 'page_view',
        occurred_at: '2026-01-10T11:00:00.000Z',
      }),
      event({
        id: '4',
        journey_id: 'j-b',
        type: 'chat_submitted',
        occurred_at: '2026-01-10T11:01:00.000Z',
      }),
      event({
        id: '5',
        journey_id: 'j-b',
        type: 'chat_rendered',
        occurred_at: '2026-01-10T11:01:05.000Z',
      }),
      event({
        id: '6',
        journey_id: 'j-b',
        type: 'cv_click',
        occurred_at: '2026-01-10T11:02:00.000Z',
      }),
      event({
        id: '7',
        journey_id: 'j-b',
        type: 'contact_stored',
        occurred_at: '2026-01-10T11:05:00.000Z',
      }),
    ];

    const storedIndex = steps.findIndex((step) => step.key === 'contact_stored');
    const result = countOrderedFunnel(rows, steps);
    expect(result.steps[storedIndex]?.count).toBe(1);
  });

  it('deduplicates duplicate event ids within a journey', () => {
    const rows: JourneyEventRow[] = [
      event({
        id: 'dup',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:00:00.000Z',
      }),
      event({
        id: 'dup',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:00:01.000Z',
      }),
    ];

    const result = countOrderedFunnel(rows, steps);
    expect(result.steps[0]?.count).toBe(1);
  });

  it('counts zero for a missing intermediate step even when later events exist', () => {
    const rows: JourneyEventRow[] = [
      event({
        id: '1',
        journey_id: 'j-a',
        type: 'page_view',
        occurred_at: '2026-01-10T10:00:00.000Z',
      }),
      event({
        id: '2',
        journey_id: 'j-a',
        type: 'cv_click',
        occurred_at: '2026-01-10T10:05:00.000Z',
      }),
    ];

    const result = countOrderedFunnel(rows, steps);
    expect(result.steps[0]?.count).toBe(1);
    expect(result.steps[1]?.count).toBe(0);
    expect(result.steps[2]?.count).toBe(0);
  });
});
