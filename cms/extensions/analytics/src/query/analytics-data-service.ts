import type { AnalyticsDatabase } from './analytics-database.ts';
import type {
  ChatExchangeRecord,
  ChatReviewRecord,
  ChatReviewTag,
  EventRecord,
  ModelGenerationRecord,
} from '@portfolio/cms-schema';

import type { AnalyticsFilters } from './filters.ts';
import { filterClause } from './filters.ts';
import { computeDailyRollup, type DailyRollupValues } from './metrics.ts';
import { countOrderedFunnel, defaultJourneyFunnelSteps } from './funnel.ts';
import { defaultReportingWindow, parisDayBounds, type ReportingWindow } from './paris-calendar.ts';
import type { JourneyEventRow } from './journey-event.ts';
import { journeyEventFromStoredEvent } from './stored-events.ts';
import { jsonValueFromUnknown } from './json-value.ts';
import { redactReviewNotes } from '../redact/notes.ts';
import { readChatReviewTags } from '../review/tags.ts';
import {
  parseChatExchangeMode,
  parseChatExchangeOutcome,
  parseDeliverySource,
  parseEventType,
} from './record-narrowing.ts';

export type SummaryResponse = {
  window: ReportingWindow;
  current: DailyRollupValues;
  previous: DailyRollupValues;
  coverage: {
    analytics_status: Record<string, string | number | null>;
  };
};

export type ConversationReviewSummary = {
  listed: number;
  reviewed: number;
  outcome_answered: number;
};

export type ConversationListItem = {
  id: string;
  received_at: string | null;
  locale: string | null;
  outcome: string | null;
  mode: string | null;
  delivery_source: string | null;
  model: string | null;
  question: string | null;
  has_review: boolean;
};

export type ConversationDetail = ConversationListItem & {
  response_text: string | null;
  local_fallback: string | null;
  validation_status: string | null;
  provider_duration_ms: number | null;
  validation_duration_ms: number | null;
  failure_reason: string | null;
  evidence_references: unknown;
  publication_id: string | null;
  blocks: unknown;
  answer_slugs: unknown;
  latency_ms: number | null;
  review: {
    tags: ChatReviewTag[];
    notes: string | null;
  } | null;
};

const eventColumns = [
  'id',
  'journey_id',
  'type',
  'occurred_at',
  'received_at',
  'request_id',
  'visitor_hash',
  'conversation_id',
  'locale',
  'device_class',
  'utm_source',
  'environment',
] as const;

export class AnalyticsDataService {
  private readonly database: AnalyticsDatabase;

  constructor(database: AnalyticsDatabase) {
    this.database = database;
  }

  async loadSummary(filters: AnalyticsFilters, reference: Date): Promise<SummaryResponse> {
    const window = defaultReportingWindow(reference, 30);
    const current = await this.aggregateWindow(
      window.current.startUtc,
      window.current.endExclusiveUtc,
      filters
    );
    const previous = await this.aggregateWindow(
      window.previous.startUtc,
      window.previous.endExclusiveUtc,
      filters
    );
    const status = await this.database('analytics_status')
      .select('*')
      .where({ component: 'rollup' })
      .orderBy('last_refresh_at', 'desc')
      .first();

    return {
      window,
      current,
      previous,
      coverage: {
        analytics_status: readAnalyticsStatusRow(status),
      },
    };
  }

  async loadFunnel(filters: AnalyticsFilters, reference: Date) {
    const window = defaultReportingWindow(reference, 30);
    const rows = await this.loadEventsBetween(
      window.current.startUtc,
      window.current.endExclusiveUtc,
      filters
    );
    return {
      window,
      funnel: countOrderedFunnel(rows, defaultJourneyFunnelSteps),
    };
  }

  async listConversations(
    filters: AnalyticsFilters,
    page: number,
    limit: number
  ): Promise<{
    data: ConversationListItem[];
    total: number;
    reviewSummary: ConversationReviewSummary;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const eventFilter = filterClause(filters, {
      locale: 'chat_exchanges.locale',
      environment: 'chat_exchanges.environment',
      model: 'chat_exchanges.model',
      provider_id: 'chat_exchanges.provider_id',
      publication_id: 'chat_exchanges.publication_id',
      device_class: 'chat_exchanges.device_class',
    });

    const filteredExchanges = () =>
      this.database('chat_exchanges')
        .whereRaw('chat_exchanges.analytics_excluded IS NOT TRUE')
        .whereRaw(eventFilter.sql, eventFilter.bindings);

    const totalRow = await filteredExchanges().count('chat_exchanges.id as count').first();
    const total = Number.parseInt(readCount(totalRow), 10);

    const rows = await filteredExchanges()
      .select(
        'chat_exchanges.id',
        'chat_exchanges.received_at',
        'chat_exchanges.locale',
        'chat_exchanges.outcome',
        'chat_exchanges.mode',
        'chat_exchanges.delivery_source',
        'chat_exchanges.model',
        'chat_exchanges.question'
      )
      .select(
        this.database.raw(
          'EXISTS (SELECT 1 FROM chat_reviews WHERE chat_reviews.exchange_id = chat_exchanges.id) AS has_review'
        )
      )
      .orderBy('chat_exchanges.received_at', 'desc')
      .limit(safeLimit)
      .offset(offset);

    const reviewedRow = await filteredExchanges()
      .whereRaw(
        'EXISTS (SELECT 1 FROM chat_reviews WHERE chat_reviews.exchange_id = chat_exchanges.id)'
      )
      .count('chat_exchanges.id as count')
      .first();
    const answeredRow = await filteredExchanges()
      .where({ outcome: 'answered' })
      .count('chat_exchanges.id as count')
      .first();

    const data = rows.map((row) => ({
      id: String(row.id),
      received_at: row.received_at === null ? null : String(row.received_at),
      locale: row.locale === null ? null : String(row.locale),
      outcome: row.outcome === null ? null : String(row.outcome),
      mode: row.mode === null ? null : String(row.mode),
      delivery_source: row.delivery_source === null ? null : String(row.delivery_source),
      model: row.model === null ? null : String(row.model),
      question: row.question === null ? null : String(row.question),
      has_review: Boolean(row.has_review),
    }));

    return {
      data,
      total,
      reviewSummary: {
        listed: total,
        reviewed: Number.parseInt(readCount(reviewedRow), 10),
        outcome_answered: Number.parseInt(readCount(answeredRow), 10),
      },
    };
  }

  async loadConversationDetail(exchangeId: string): Promise<ConversationDetail | null> {
    const exchange = await this.database('chat_exchanges')
      .where({ id: exchangeId })
      .whereRaw('chat_exchanges.analytics_excluded IS NOT TRUE')
      .first();
    if (exchange === undefined) {
      return null;
    }

    const review = await this.database('chat_reviews').where({ exchange_id: exchangeId }).first();
    const requestId =
      exchange.request_id === null || exchange.request_id === undefined
        ? null
        : String(exchange.request_id);
    const fallback = await this.loadLocalFallback(requestId);

    return {
      id: String(exchange.id),
      received_at: exchange.received_at === null ? null : String(exchange.received_at),
      locale: exchange.locale === null ? null : String(exchange.locale),
      outcome: exchange.outcome === null ? null : String(exchange.outcome),
      mode: exchange.mode === null ? null : String(exchange.mode),
      delivery_source: exchange.delivery_source === null ? null : String(exchange.delivery_source),
      model: exchange.model === null ? null : String(exchange.model),
      question: exchange.question === null ? null : String(exchange.question),
      has_review: review !== undefined,
      response_text: exchange.response_text === null ? null : String(exchange.response_text),
      local_fallback: fallback,
      validation_status:
        exchange.validation_status === null ? null : String(exchange.validation_status),
      provider_duration_ms: toNumberOrNull(exchange.provider_duration_ms),
      validation_duration_ms: toNumberOrNull(exchange.validation_duration_ms),
      failure_reason: exchange.failure_reason === null ? null : String(exchange.failure_reason),
      evidence_references: exchange.evidence_references ?? null,
      publication_id: exchange.publication_id === null ? null : String(exchange.publication_id),
      blocks: exchange.blocks ?? null,
      answer_slugs: exchange.answer_slugs ?? null,
      latency_ms: toNumberOrNull(exchange.latency_ms),
      review:
        review === undefined
          ? null
          : {
              tags: parseReviewTags(review.tags),
              notes: review.notes === null ? null : String(review.notes),
            },
    };
  }

  async upsertReview(
    exchangeId: string,
    tags: ChatReviewTag[],
    notes: string | null,
    userId: string
  ): Promise<ChatReviewRecord> {
    const existing = await this.database('chat_reviews').where({ exchange_id: exchangeId }).first();
    const safeNotes = notes === null ? null : redactReviewNotes(notes);
    const payload = {
      exchange_id: exchangeId,
      tags: JSON.stringify(tags),
      notes: safeNotes,
      user_created: userId,
      date_updated: new Date().toISOString(),
    };

    if (existing === undefined) {
      const id = crypto.randomUUID();
      await this.database('chat_reviews').insert({
        id,
        date_created: new Date().toISOString(),
        ...payload,
      });
      return {
        id,
        date_created: payload.date_updated,
        date_updated: payload.date_updated,
        user_created: userId,
        exchange_id: exchangeId,
        tags,
        notes: safeNotes,
      };
    }

    await this.database('chat_reviews').where({ id: existing.id }).update(payload);
    return {
      id: String(existing.id),
      date_created: existing.date_created === null ? null : String(existing.date_created),
      date_updated: payload.date_updated,
      user_created: existing.user_created === null ? userId : String(existing.user_created),
      exchange_id: exchangeId,
      tags,
      notes: safeNotes,
    };
  }

  async rollupParisDay(day: string, environment: string): Promise<DailyRollupValues> {
    const bounds = parisDayBounds(day);
    const events = await this.loadFullEventsBetween(bounds.startUtc, bounds.endUtc);
    const exchanges = await this.loadExchangesBetween(bounds.startUtc, bounds.endUtc);
    const generations = await this.loadGenerationsBetween(bounds.startUtc, bounds.endUtc);
    const rollup = computeDailyRollup({ day, events, exchanges, generations });
    await this.database('daily_stats')
      .insert({
        id: crypto.randomUUID(),
        ...rollup,
        environment,
        rollup_coverage: JSON.stringify(rollup.rollup_coverage),
        contact_messages: null,
        cv_downloads: null,
        impressions: null,
        clicks: null,
        ctr: null,
        average_position: null,
      })
      .onConflict(['day', 'environment'])
      .merge({
        ...rollup,
        environment,
        rollup_coverage: JSON.stringify(rollup.rollup_coverage),
      });
    return rollup;
  }

  private async aggregateWindow(
    startUtc: string,
    endExclusiveUtc: string,
    filters: AnalyticsFilters
  ) {
    const events = await this.loadFullEventsBetween(startUtc, endExclusiveUtc, filters);
    const exchanges = await this.loadExchangesBetween(startUtc, endExclusiveUtc, filters);
    const generations = await this.loadGenerationsBetween(startUtc, endExclusiveUtc, filters);
    return computeDailyRollup({
      day: 'window',
      events,
      exchanges,
      generations,
    });
  }

  private async loadEventsBetween(
    startUtc: string,
    endExclusiveUtc: string,
    filters: AnalyticsFilters
  ): Promise<JourneyEventRow[]> {
    const rows = await this.loadFullEventsBetween(startUtc, endExclusiveUtc, filters);
    return rows.map((row) =>
      journeyEventFromStoredEvent({
        id: row.id,
        journey_id: row.journey_id ?? null,
        type: row.type,
        occurred_at: row.occurred_at ?? null,
        received_at: row.received_at ?? null,
        request_id: row.request_id ?? null,
      })
    );
  }

  private async loadFullEventsBetween(
    startUtc: string,
    endExclusiveUtc: string,
    filters: AnalyticsFilters = {}
  ): Promise<EventRecord[]> {
    const eventFilter = filterClause(filters, {
      locale: 'events.locale',
      environment: 'events.environment',
      device_class: 'events.device_class',
      utm_source: 'events.utm_source',
    });
    const rows = await this.database('events')
      .select([...eventColumns, 'payload'])
      .whereRaw('COALESCE(events.received_at, events.date_created) >= ?', [startUtc])
      .andWhereRaw('COALESCE(events.received_at, events.date_created) < ?', [endExclusiveUtc])
      .whereRaw(eventFilter.sql, eventFilter.bindings);
    return rows.map(toEventRecord);
  }

  private async loadExchangesBetween(
    startUtc: string,
    endExclusiveUtc: string,
    filters: AnalyticsFilters = {}
  ): Promise<ChatExchangeRecord[]> {
    const eventFilter = filterClause(filters, {
      locale: 'chat_exchanges.locale',
      environment: 'chat_exchanges.environment',
      model: 'chat_exchanges.model',
      provider_id: 'chat_exchanges.provider_id',
      publication_id: 'chat_exchanges.publication_id',
      device_class: 'chat_exchanges.device_class',
    });
    const rows = await this.database('chat_exchanges')
      .whereRaw('COALESCE(chat_exchanges.received_at, chat_exchanges.date_created) >= ?', [
        startUtc,
      ])
      .andWhereRaw('COALESCE(chat_exchanges.received_at, chat_exchanges.date_created) < ?', [
        endExclusiveUtc,
      ])
      .whereRaw('chat_exchanges.analytics_excluded IS NOT TRUE')
      .whereRaw(eventFilter.sql, eventFilter.bindings);
    return rows.map(toExchangeRecord);
  }

  private async loadGenerationsBetween(
    startUtc: string,
    endExclusiveUtc: string,
    filters: AnalyticsFilters = {}
  ): Promise<ModelGenerationRecord[]> {
    const eventFilter = filterClause(filters, {
      environment: 'model_generations.environment',
      model: 'model_generations.model',
      provider_id: 'model_generations.provider_id',
      publication_id: 'model_generations.publication_id',
    });
    const rows = await this.database('model_generations')
      .whereRaw('COALESCE(model_generations.received_at, model_generations.date_created) >= ?', [
        startUtc,
      ])
      .andWhereRaw('COALESCE(model_generations.received_at, model_generations.date_created) < ?', [
        endExclusiveUtc,
      ])
      .whereRaw('model_generations.analytics_excluded IS NOT TRUE')
      .whereRaw(eventFilter.sql, eventFilter.bindings);
    return rows.map(toGenerationRecord);
  }

  private async loadLocalFallback(requestId: string | null): Promise<string | null> {
    if (requestId === null || requestId === '') {
      return null;
    }
    const row = await this.database('events')
      .where({ type: 'chat_local_fallback', request_id: requestId })
      .orderBy('received_at', 'desc')
      .first();
    if (row === undefined) {
      return null;
    }
    const payload = row.payload;
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    if (!('text' in payload)) {
      return null;
    }
    const text = payload.text;
    if (typeof text !== 'string') {
      return null;
    }
    return text;
  }
}

function readCount(row: Record<string, unknown> | undefined): string {
  if (row === undefined) {
    return '0';
  }
  const count = row.count;
  if (typeof count === 'string' || typeof count === 'number') {
    return String(count);
  }
  return '0';
}

function readAnalyticsStatusRow(
  row: Record<string, unknown> | undefined
): Record<string, string | number | null> {
  if (row === undefined) {
    return {};
  }
  const status: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      status[key] = value.toISOString();
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      status[key] = JSON.stringify(value);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || value === null) {
      status[key] = value;
    }
  }
  return status;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function parseReviewTags(raw: unknown): ChatReviewTag[] {
  if (raw === null || raw === undefined) {
    return [];
  }
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parseReviewTags(parsed);
    } catch {
      return [];
    }
  }
  return readChatReviewTags(raw);
}

function toEventRecord(row: Record<string, unknown>): EventRecord {
  return {
    id: String(row.id),
    date_created: null,
    type: parseEventType(row.type),
    path: null,
    locale: null,
    referrer_host: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    device_class: null,
    visitor_hash:
      row.visitor_hash === null || row.visitor_hash === undefined ? null : String(row.visitor_hash),
    payload: jsonValueFromUnknown(row.payload),
    journey_id:
      row.journey_id === null || row.journey_id === undefined ? null : String(row.journey_id),
    occurred_at:
      row.occurred_at === null || row.occurred_at === undefined ? null : String(row.occurred_at),
    received_at:
      row.received_at === null || row.received_at === undefined ? null : String(row.received_at),
    request_id:
      row.request_id === null || row.request_id === undefined ? null : String(row.request_id),
    conversation_id:
      row.conversation_id === null || row.conversation_id === undefined
        ? null
        : String(row.conversation_id),
    environment: null,
    analytics_version: null,
    source: null,
  };
}

function toExchangeRecord(row: Record<string, unknown>): ChatExchangeRecord {
  return {
    id: String(row.id),
    date_created: null,
    locale: null,
    conversation_id: null,
    question: null,
    mode: parseChatExchangeMode(row.mode),
    outcome: parseChatExchangeOutcome(row.outcome),
    answer_slugs: null,
    blocks: null,
    latency_ms: null,
    model: row.model === null || row.model === undefined ? null : String(row.model),
    input_tokens: null,
    output_tokens: null,
    cost_eur: null,
    failure_reason: null,
    publication_id: null,
    delivery_source: parseDeliverySource(row.delivery_source),
    analytics_excluded: row.analytics_excluded === true,
    received_at:
      row.received_at === null || row.received_at === undefined ? null : String(row.received_at),
  };
}

function toGenerationRecord(row: Record<string, unknown>): ModelGenerationRecord {
  return {
    id: String(row.id),
    date_created: null,
    exchange_id: String(row.exchange_id ?? ''),
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
    cost_eur: row.cost_eur === null || row.cost_eur === undefined ? null : Number(row.cost_eur),
    provider_cost_usd: null,
    analytics_excluded: row.analytics_excluded === true,
    received_at:
      row.received_at === null || row.received_at === undefined ? null : String(row.received_at),
  };
}
