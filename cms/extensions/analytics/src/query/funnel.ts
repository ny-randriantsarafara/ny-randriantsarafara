import type { EventType } from '@portfolio/cms-schema';

import { eventSortKey, isAnalyticsIncluded, type JourneyEventRow } from './journey-event.ts';

export type FunnelStepDefinition = {
  key: string;
  label: string;
  eventTypes: EventType[];
  dedupeCvLegacy?: boolean;
};

export type FunnelStepCount = {
  key: string;
  label: string;
  count: number;
};

export type FunnelResult = {
  entered: number;
  steps: FunnelStepCount[];
};

export const defaultJourneyFunnelSteps: FunnelStepDefinition[] = [
  { key: 'page_view', label: 'Page view', eventTypes: ['page_view'] },
  { key: 'chat_submitted', label: 'Chat submitted', eventTypes: ['chat_submitted'] },
  { key: 'chat_rendered', label: 'Chat rendered', eventTypes: ['chat_rendered'] },
  {
    key: 'cv_link',
    label: 'CV link click',
    eventTypes: ['cv_click', 'cv_download'],
    dedupeCvLegacy: true,
  },
  { key: 'contact_stored', label: 'Contact stored', eventTypes: ['contact_stored'] },
];

export function countOrderedFunnel(
  rows: JourneyEventRow[],
  steps: FunnelStepDefinition[]
): FunnelResult {
  const byJourney = groupIncludedEvents(rows);
  const stepCounts = steps.map((step) => ({ key: step.key, label: step.label, count: 0 }));

  for (const journeyEvents of byJourney.values()) {
    const ordered = [...journeyEvents].sort((left, right) =>
      eventSortKey(left).localeCompare(eventSortKey(right))
    );
    let stepIndex = 0;

    for (const row of ordered) {
      if (stepIndex >= steps.length) {
        break;
      }
      const step = steps[stepIndex];
      if (step === undefined) {
        break;
      }
      if (!matchesStep(row.type, step)) {
        continue;
      }
      const current = stepCounts[stepIndex];
      if (current !== undefined) {
        stepCounts[stepIndex] = { ...current, count: current.count + 1 };
      }
      stepIndex += 1;
    }
  }

  return {
    entered: stepCounts[0]?.count ?? 0,
    steps: stepCounts,
  };
}

function matchesStep(type: EventType | null, step: FunnelStepDefinition): boolean {
  if (type === null) {
    return false;
  }
  return step.eventTypes.includes(type);
}

function groupIncludedEvents(rows: JourneyEventRow[]): Map<string, JourneyEventRow[]> {
  const seenIds = new Set<string>();
  const byJourney = new Map<string, JourneyEventRow[]>();

  for (const row of rows) {
    if (!isAnalyticsIncluded(row)) {
      continue;
    }
    if (row.journey_id === null || row.journey_id === '') {
      continue;
    }
    if (seenIds.has(row.id)) {
      continue;
    }
    seenIds.add(row.id);
    const bucket = byJourney.get(row.journey_id);
    if (bucket === undefined) {
      byJourney.set(row.journey_id, [row]);
      continue;
    }
    bucket.push(row);
  }

  return byJourney;
}

export function countCvLinkClicks(rows: JourneyEventRow[]): number {
  const byJourney = groupIncludedEvents(rows);
  let total = 0;

  for (const journeyEvents of byJourney.values()) {
    const hasClick = journeyEvents.some((row) => row.type === 'cv_click');
    const hasLegacy = journeyEvents.some((row) => row.type === 'cv_download');
    if (hasClick || hasLegacy) {
      total += 1;
    }
  }

  return total;
}
