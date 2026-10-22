import { describe, expect, it } from 'vitest';
import {
  createDirectusExchangeRecorder,
  type ExchangeRecordInput,
} from '../chat/exchange-recorder.ts';
import { createDirectusEventStore } from '../events/event-store.ts';
import { createTelemetryCollector } from './collector.ts';

const exchange: ExchangeRecordInput = {
  locale: 'en',
  conversationId: 'conversation',
  requestId: 'same-client-turn',
  journeyId: 'journey',
  question: 'Write jane@example.com password=smallsecret',
  responseText: 'Contact jane@example.com using token=secret',
  mode: 'scripted',
  outcome: 'unknown',
  answerSlugs: [],
  blocks: [],
  latencyMs: 1,
  model: null,
  inputTokens: null,
  outputTokens: null,
  costEur: null,
  failureReason: null,
  publicationId: 'publication',
};
describe('telemetry persistence boundary', () => {
  it('bounds accepted evidence and redacts both directions while generating independent execution IDs', async () => {
    const rows: Record<string, unknown>[] = [];
    const recorder = createDirectusExchangeRecorder(
      'https://cms.example',
      'test',
      () => {},
      async (_url, init) => {
        rows.push(JSON.parse(String(init?.body)));
        return Response.json({ data: {} });
      }
    );
    await recorder.record({
      ...exchange,
      evidenceReferences: Array.from({ length: 100 }, () => ({
        sourceId: 'answers/example/text/en',
        quote: 'jane@example.com',
      })),
    });
    await recorder.record(exchange);
    expect(rows[0]?.question).toBe('Write [email] password=[credential]');
    expect(rows[0]?.response_text).toBe('Contact [email] using token=[credential]');
    expect(rows[0]?.evidence_references).toHaveLength(32);
    expect(rows[0]?.id).not.toBe(rows[1]?.id);
    expect(rows[0]?.id).not.toBe(exchange.requestId);
    expect(JSON.stringify(rows)).not.toContain('jane@example.com');
  });
  it('defends excluded data at storage even if a caller supplies private text and correlations', async () => {
    const rows: Record<string, unknown>[] = [];
    const recorder = createDirectusExchangeRecorder(
      'https://cms.example',
      'test',
      () => {},
      async (_url, init) => {
        rows.push(JSON.parse(String(init?.body)));
        return Response.json({ data: {} });
      }
    );
    await recorder.record({
      ...exchange,
      analyticsExcluded: true,
      inputTokens: 120,
      outputTokens: 40,
      costEur: 0.0008,
      responseText: 'Still redacted when excluded',
    });
    expect(rows[0]).toMatchObject({
      question: null,
      response_text: null,
      request_id: null,
      journey_id: null,
      conversation_id: null,
      locale: null,
      analytics_excluded: true,
      input_tokens: 120,
      output_tokens: 40,
      cost_eur: 0.0008,
    });
    expect(JSON.stringify(rows)).not.toContain('Still redacted');
  });
  it('deduplicates an event whose first write committed before a lost response', async () => {
    const stored = new Map<string, unknown>();
    let calls = 0;
    const logs: string[] = [];
    const collector = createTelemetryCollector({
      log: (message) => logs.push(message),
      retryDelayMs: 0,
    });
    const store = createDirectusEventStore(
      'https://cms.example',
      'test',
      (message) => logs.push(message),
      async (_url, init) => {
        calls++;
        const row = JSON.parse(String(init?.body));
        if (stored.has(row.id))
          return Response.json(
            { errors: [{ extensions: { code: 'RECORD_NOT_UNIQUE' } }] },
            { status: 400 }
          );
        stored.set(row.id, row);
        throw new Error('lost response');
      },
      collector
    );
    const event = {
      eventId: '00000000-0000-4000-8000-000000000011',
      type: 'page_view' as const,
      path: '/',
      locale: 'en',
      visitorHash: 'daily',
      deviceClass: 'desktop' as const,
      payload: null,
      referrerHost: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    };
    await store.save(event);
    await store.save(event);
    expect(calls).toBe(3);
    expect(stored.size).toBe(1);
    expect(logs).toEqual([]);
  });
});
