import { createDirectus, createItem, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { createTelemetryCollector, type TelemetryCollector } from './collector.ts';

export type TelemetryCollection = 'events' | 'chat_exchanges' | 'model_generations';

export function createTelemetryWriter(
  directusUrl: string,
  apiToken: string,
  log: (message: string) => void,
  fetchImpl: typeof fetch = globalThis.fetch,
  collector: TelemetryCollector = createTelemetryCollector({ log })
) {
  const client = createDirectus<PortfolioSchema>(directusUrl, {
    globals: {
      fetch: (input, init) => fetchImpl(input, { ...init, signal: AbortSignal.timeout(1500) }),
      WebSocket: globalThis.WebSocket,
      URL: globalThis.URL,
      logger: globalThis.console,
    },
  })
    .with(staticToken(apiToken))
    .with(rest());
  return {
    collector,
    write(
      collection: TelemetryCollection,
      row: { id: string } & Record<string, unknown>
    ): Promise<void> {
      return collector.enqueue(collection, row.id, async () => {
        try {
          await client.request(createItem(collection, row));
        } catch (error) {
          if (!isDuplicate(error)) throw error;
        }
      });
    },
  };
}

// A repeated stable primary key means the previous write committed, possibly before a lost response.
function isDuplicate(error: unknown): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('errors' in error) ||
    !Array.isArray(error.errors)
  )
    return false;
  return error.errors.some(
    (entry: unknown) =>
      typeof entry === 'object' &&
      entry !== null &&
      'extensions' in entry &&
      typeof entry.extensions === 'object' &&
      entry.extensions !== null &&
      'code' in entry.extensions &&
      entry.extensions.code === 'RECORD_NOT_UNIQUE'
  );
}
