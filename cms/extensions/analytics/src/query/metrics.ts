import type { ChatExchangeRecord, EventRecord, ModelGenerationRecord } from '@portfolio/cms-schema';

import { countCvLinkClicks } from './funnel.ts';
import { isAnalyticsIncluded, type JourneyEventRow } from './journey-event.ts';
import { formatParisDate } from './paris-calendar.ts';

export type DailyRollupInput = {
  day: string;
  events: EventRecord[];
  exchanges: ChatExchangeRecord[];
  generations: ModelGenerationRecord[];
};

export type DailyRollupValues = {
  day: string;
  visitors: number;
  visitor_days: number;
  page_views: number;
  conversations: number;
  model_exchanges: number;
  scripted_exchanges: number;
  outcome_answered: number;
  outcome_unknown: number;
  outcome_sensitive: number;
  outcome_refused: number;
  contact_stored: number;
  cv_link_clicks: number;
  content_impressions: number;
  chat_submitted: number;
  chat_rendered: number;
  cache_deliveries: number;
  generation_attempts: number;
  generations_known_cost: number;
  generations_unknown_cost: number;
  model_cost_eur: number;
  rollup_coverage: {
    events: number;
    chat_exchanges: number;
    model_generations: number;
  };
};

export function computeDailyRollup(input: DailyRollupInput): DailyRollupValues {
  const events = input.events;
  const journeyRows = events.map(toJourneyRow);
  const visitorHashes = new Set<string>();
  const visitorDayPairs = new Set<string>();

  for (const row of events) {
    if (row.visitor_hash !== null && row.visitor_hash !== '') {
      visitorHashes.add(row.visitor_hash);
      const visitorDay = visitorDayForRollup(row, input.day);
      if (visitorDay !== null) {
        visitorDayPairs.add(`${row.visitor_hash}:${visitorDay}`);
      }
    }
  }

  const pageViews = events.filter((row) => row.type === 'page_view').length;
  const conversationIds = new Set(
    events
      .map((row) => row.conversation_id)
      .filter((value): value is string => value !== null && value !== undefined && value !== '')
  );

  const exchanges = input.exchanges.filter((row) => row.analytics_excluded !== true);
  const modelExchanges = exchanges.filter((row) => row.mode === 'model').length;
  const scriptedExchanges = exchanges.filter((row) => row.mode === 'scripted').length;
  const cacheDeliveries = exchanges.filter(
    (row) => row.delivery_source === 'cache' || row.delivery_source === 'shared'
  ).length;

  const outcomeAnswered = exchanges.filter((row) => row.outcome === 'answered').length;
  const outcomeUnknown = exchanges.filter((row) => row.outcome === 'unknown').length;
  const outcomeSensitive = exchanges.filter((row) => row.outcome === 'sensitive').length;
  const outcomeRefused = exchanges.filter((row) => row.outcome === 'refused').length;

  const generations = input.generations.filter((row) => row.analytics_excluded !== true);
  let knownCost = 0;
  let unknownCost = 0;
  let modelCost = 0;

  for (const generation of generations) {
    if (generation.cost_eur === null || generation.cost_eur === undefined) {
      unknownCost += 1;
      continue;
    }
    knownCost += 1;
    modelCost += generation.cost_eur;
  }

  return {
    day: input.day,
    visitors: visitorHashes.size,
    visitor_days: visitorDayPairs.size,
    page_views: pageViews,
    conversations: conversationIds.size,
    model_exchanges: modelExchanges,
    scripted_exchanges: scriptedExchanges,
    outcome_answered: outcomeAnswered,
    outcome_unknown: outcomeUnknown,
    outcome_sensitive: outcomeSensitive,
    outcome_refused: outcomeRefused,
    contact_stored: events.filter((row) => row.type === 'contact_stored').length,
    cv_link_clicks: countCvLinkClicks(journeyRows),
    content_impressions: events.filter((row) => row.type === 'content_impression').length,
    chat_submitted: events.filter((row) => row.type === 'chat_submitted').length,
    chat_rendered: events.filter((row) => row.type === 'chat_rendered').length,
    cache_deliveries: cacheDeliveries,
    generation_attempts: generations.length,
    generations_known_cost: knownCost,
    generations_unknown_cost: unknownCost,
    model_cost_eur: modelCost,
    rollup_coverage: {
      events: events.length,
      chat_exchanges: exchanges.length,
      model_generations: generations.length,
    },
  };
}

export function countDistinctJourneys(rows: JourneyEventRow[]): number {
  const journeys = new Set<string>();
  for (const row of rows) {
    if (!isAnalyticsIncluded(row)) {
      continue;
    }
    if (row.journey_id === null || row.journey_id === '') {
      continue;
    }
    journeys.add(row.journey_id);
  }
  return journeys.size;
}

export function visitorDayForRollup(row: EventRecord, rollupDay: string): string | null {
  if (rollupDay !== 'window') {
    return rollupDay;
  }
  const instant = row.received_at ?? row.occurred_at ?? null;
  if (instant === null || instant === '') {
    return null;
  }
  return formatParisDate(new Date(instant));
}

function toJourneyRow(row: EventRecord): JourneyEventRow {
  return {
    id: row.id,
    journey_id: row.journey_id ?? null,
    type: row.type,
    occurred_at: row.occurred_at ?? null,
    received_at: row.received_at ?? null,
    request_id: row.request_id ?? null,
    analytics_excluded: null,
  };
}
