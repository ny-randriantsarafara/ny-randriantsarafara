import { createDirectus, createItem, isDirectusError, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

import type { AlertCreateResult, AlertPayload, AlertStore } from './raise-alert.ts';

export function createDirectusAlertStore(directusUrl: string, apiToken: string): AlertStore {
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
    create: (payload) => createAlertRow(client, payload),
  };
}

async function createAlertRow(
  client: ReturnType<typeof createDirectus<PortfolioSchema>>,
  payload: AlertPayload
): Promise<AlertCreateResult> {
  try {
    await client.request(
      createItem('alerts', {
        kind: payload.kind,
        dedup_key: payload.dedupKey,
        details: payload.details,
      })
    );
    return { created: true };
  } catch (error) {
    if (isDuplicateAlert(error)) {
      return { created: false, reason: 'duplicate' };
    }
    throw error;
  }
}

function isDuplicateAlert(error: unknown): boolean {
  if (!isDirectusError(error)) {
    return false;
  }
  return error.errors.some((entry) => entry.extensions.code === 'RECORD_NOT_UNIQUE');
}
