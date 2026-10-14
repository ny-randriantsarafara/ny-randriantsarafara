import { createDirectus, readSingleton, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { z } from 'zod';

import type { ModelSettingsRow, ModelSettingsSource } from './model-settings.ts';

// Directus answers {} for a singleton that was never saved.
const modelSettingsRowSchema = z.object({
  model: z.string().nullable().default(null),
  input_price_eur_per_million: z.number().nullable().default(null),
  output_price_eur_per_million: z.number().nullable().default(null),
  timeout_ms: z.number().nullable().default(null),
});

export function createDirectusModelSettingsSource(
  directusUrl: string,
  apiToken: string
): ModelSettingsSource {
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
    async readSettings(): Promise<ModelSettingsRow> {
      const record = await client.request(
        readSingleton('model_settings', {
          fields: [
            'model',
            'input_price_eur_per_million',
            'output_price_eur_per_million',
            'timeout_ms',
          ],
        })
      );
      return modelSettingsRowSchema.parse(record);
    },
  };
}
