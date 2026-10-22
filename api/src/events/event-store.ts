import { randomUUID } from 'node:crypto';
import type { EventType, JsonValue } from '@portfolio/cms-schema';
import { createTelemetryWriter } from '../analytics/directus-writer.ts';
import type { TelemetryCollector } from '../analytics/collector.ts';
import type { DeviceClass } from './device-class.ts';
export type StoredEvent = {
  eventId?: string;
  journeyId?: string | null;
  requestId?: string | null;
  conversationId?: string | null;
  occurredAt?: string | null;
  receivedAt?: string;
  type: EventType;
  path: string;
  locale: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceClass: DeviceClass;
  visitorHash: string;
  payload: JsonValue;
};

export type EventStore = {
  save(event: StoredEvent): Promise<void>;
};

export function createDirectusEventStore(
  directusUrl: string,
  apiToken: string,
  log: (message: string) => void,
  fetchImpl: typeof fetch = globalThis.fetch,
  collector?: TelemetryCollector,
  environment: 'local' | 'staging' | 'prod' = 'local'
): EventStore {
  const writer = createTelemetryWriter(directusUrl, apiToken, log, fetchImpl, collector);
  return {
    save(event) {
      return writer.write('events', {
        id: event.eventId ?? randomUUID(),
        received_at: event.receivedAt ?? new Date().toISOString(),
        occurred_at: event.occurredAt ?? null,
        analytics_version: 1,
        environment,
        journey_id: event.journeyId ?? null,
        request_id: event.requestId ?? null,
        conversation_id: event.conversationId ?? null,
        source: event.type === 'contact_stored' ? 'server' : 'client',
        type: event.type,
        path: event.path,
        locale: event.locale,
        referrer_host: event.referrerHost,
        utm_source: event.utmSource,
        utm_medium: event.utmMedium,
        utm_campaign: event.utmCampaign,
        device_class: event.deviceClass,
        visitor_hash: event.visitorHash,
        payload: event.payload,
      });
    },
  };
}
