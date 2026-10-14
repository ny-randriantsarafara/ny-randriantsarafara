import { createDirectus, createItem, rest, staticToken } from '@directus/sdk';
import type { EventType, JsonValue } from '@portfolio/cms-schema';
import type { PortfolioSchema } from '@portfolio/cms-schema';

import type { DeviceClass } from './device-class.ts';

export type StoredEvent = {
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
  log: (message: string) => void
): EventStore {
  const client = createDirectus<PortfolioSchema>(directusUrl, {
    globals: {
      fetch: globalThis.fetch,
      WebSocket: globalThis.WebSocket,
      URL: globalThis.URL,
      logger: globalThis.console,
    },
  })
    .with(staticToken(apiToken))
    .with(rest());

  return {
    save: (event) => persistEvent(client, event, log),
  };
}

async function persistEvent(
  client: ReturnType<typeof createDirectus<PortfolioSchema>>,
  event: StoredEvent,
  log: (message: string) => void
): Promise<void> {
  try {
    await client.request(
      createItem('events', {
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
      })
    );
  } catch (error) {
    log(`Event recording failed: ${describeError(error)}`);
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
