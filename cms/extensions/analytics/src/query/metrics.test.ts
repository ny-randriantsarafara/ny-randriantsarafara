import { describe, expect, it } from 'vitest';

import type { ChatExchangeRecord, EventRecord, ModelGenerationRecord } from '@portfolio/cms-schema';

import { computeDailyRollup } from './metrics.ts';

function event(partial: Partial<EventRecord> & Pick<EventRecord, 'id' | 'type'>): EventRecord {
  return {
    date_created: null,
    path: null,
    locale: null,
    referrer_host: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    device_class: null,
    visitor_hash: null,
    payload: null,
    ...partial,
  };
}

function exchange(
  partial: Partial<ChatExchangeRecord> & Pick<ChatExchangeRecord, 'id'>
): ChatExchangeRecord {
  return {
    date_created: null,
    locale: null,
    conversation_id: null,
    question: null,
    mode: 'model',
    outcome: 'answered',
    answer_slugs: null,
    blocks: null,
    latency_ms: null,
    model: null,
    input_tokens: null,
    output_tokens: null,
    cost_eur: null,
    failure_reason: null,
    publication_id: null,
    analytics_excluded: false,
    ...partial,
  };
}

function generation(
  partial: Partial<ModelGenerationRecord> & Pick<ModelGenerationRecord, 'id' | 'exchange_id'>
): ModelGenerationRecord {
  return {
    date_created: null,
    completed_at: null,
    conversation_id: null,
    publication_id: null,
    status: 'completed',
    failure_reason: null,
    model: null,
    served_model: null,
    provider_id: null,
    profile_id: null,
    configuration_fingerprint: null,
    prompt_version: null,
    input_bytes: null,
    context_bytes: null,
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
    cost_eur: null,
    provider_cost_usd: null,
    analytics_excluded: false,
    ...partial,
  };
}

describe('computeDailyRollup', () => {
  it('derives visitors, impressions and costs from mixed fixtures', () => {
    const events: EventRecord[] = [
      event({
        id: 'e1',
        type: 'page_view',
        visitor_hash: 'v1',
        journey_id: 'j1',
      }),
      event({
        id: 'e2',
        type: 'page_view',
        visitor_hash: 'v1',
        journey_id: 'j2',
      }),
      event({
        id: 'e3',
        type: 'content_impression',
        visitor_hash: 'v2',
        journey_id: 'j3',
      }),
      event({
        id: 'e4',
        type: 'block_view',
        visitor_hash: 'v2',
        journey_id: 'j3',
      }),
      event({
        id: 'e5',
        type: 'cv_click',
        journey_id: 'j1',
      }),
      event({
        id: 'e6',
        type: 'cv_download',
        journey_id: 'j1',
      }),
      event({
        id: 'e7',
        type: 'contact_submit',
        journey_id: 'j1',
      }),
      event({
        id: 'e8',
        type: 'contact_stored',
        journey_id: 'j4',
      }),
    ];

    const exchanges: ChatExchangeRecord[] = [
      exchange({ id: 'x1', mode: 'model', delivery_source: 'provider', outcome: 'answered' }),
      exchange({ id: 'x2', mode: 'scripted', delivery_source: 'scripted', outcome: 'unknown' }),
      exchange({ id: 'x3', mode: 'model', delivery_source: 'cache', outcome: 'answered' }),
    ];

    const generations: ModelGenerationRecord[] = [
      generation({ id: 'g1', exchange_id: 'x1', cost_eur: 0.02 }),
      generation({ id: 'g2', exchange_id: 'x9', cost_eur: null }),
    ];

    const rollup = computeDailyRollup({ day: '2026-01-10', events, exchanges, generations });

    expect(rollup.visitors).toBe(2);
    expect(rollup.visitor_days).toBe(2);
    expect(rollup.page_views).toBe(2);
    expect(rollup.content_impressions).toBe(1);
    expect(rollup.cv_link_clicks).toBe(1);
    expect(rollup.contact_stored).toBe(1);
    expect(rollup.model_exchanges).toBe(2);
    expect(rollup.scripted_exchanges).toBe(1);
    expect(rollup.cache_deliveries).toBe(1);
    expect(rollup.generations_known_cost).toBe(1);
    expect(rollup.generations_unknown_cost).toBe(1);
    expect(rollup.model_cost_eur).toBeCloseTo(0.02);
  });

  it('skips visitor-day pairing when window rollups lack timestamps', () => {
    const events: EventRecord[] = [
      event({
        id: 'e1',
        type: 'page_view',
        visitor_hash: 'v1',
        received_at: null,
        occurred_at: null,
      }),
      event({
        id: 'e2',
        type: 'page_view',
        visitor_hash: 'v2',
        received_at: '2026-01-11T12:00:00.000Z',
      }),
    ];

    const rollup = computeDailyRollup({ day: 'window', events, exchanges: [], generations: [] });
    expect(rollup.visitor_days).toBe(1);
  });

  it('counts visitor-days per Paris day when rolling up a multi-day window', () => {
    const events: EventRecord[] = [
      event({
        id: 'e1',
        type: 'page_view',
        visitor_hash: 'v1',
        received_at: '2026-01-10T22:00:00.000Z',
      }),
      event({
        id: 'e2',
        type: 'page_view',
        visitor_hash: 'v1',
        received_at: '2026-01-11T22:00:00.000Z',
      }),
    ];

    const rollup = computeDailyRollup({ day: 'window', events, exchanges: [], generations: [] });
    expect(rollup.visitor_days).toBe(2);
  });

  it('drops analytics_excluded exchanges from cache and outcome counts', () => {
    const exchanges: ChatExchangeRecord[] = [
      exchange({ id: 'x1', mode: 'model', delivery_source: 'cache', outcome: 'answered' }),
      exchange({
        id: 'x2',
        mode: 'model',
        delivery_source: 'cache',
        outcome: 'answered',
        analytics_excluded: true,
      }),
    ];

    const rollup = computeDailyRollup({
      day: '2026-01-10',
      events: [],
      exchanges,
      generations: [],
    });
    expect(rollup.model_exchanges).toBe(1);
    expect(rollup.cache_deliveries).toBe(1);
    expect(rollup.outcome_answered).toBe(1);
  });
});
