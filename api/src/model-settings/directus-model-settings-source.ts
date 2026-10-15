import { createDirectus, readSingleton, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { z } from 'zod';

import type { ModelSettingsRow, ModelSettingsSource } from './model-settings.ts';

// Directus answers {} for a singleton that was never saved.
const profileSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  provider: z.enum(['openrouter', 'google-ai-studio', 'openai']),
  model: z.string().nullable(),
  input_price_eur_per_million: z.number().nullable(),
  output_price_eur_per_million: z.number().nullable(),
  cache_read_price_eur_per_million: z.number().nullable(),
  cache_write_price_eur_per_million: z.number().nullable(),
  reasoning_effort: z.string().nullable(),
  timeout_ms: z.number().nullable(),
  max_input_bytes: z.number().optional(),
  max_output_tokens: z.number().nullable().optional(),
  response_cache_enabled: z.boolean().optional(),
});
const modelSettingsRowSchema = z.object({
  configuration_source: z.enum(['legacy', 'profile', 'disabled']).default('legacy'),
  active_profile: profileSchema.nullable().optional(),
  max_input_bytes: z.number().optional(),
  max_output_tokens: z.number().nullable().optional(),
  response_cache_enabled: z.boolean().optional(),
  model: z.string().nullable().default(null),
  input_price_eur_per_million: z.number().nullable().default(null),
  output_price_eur_per_million: z.number().nullable().default(null),
  cache_read_price_eur_per_million: z.number().nullable().default(null),
  cache_write_price_eur_per_million: z.number().nullable().default(null),
  reasoning_effort: z.string().nullable().default(null),
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
            'configuration_source',
            'max_input_bytes',
            'max_output_tokens',
            'response_cache_enabled',
            { active_profile: ['*'] },
            'model',
            'input_price_eur_per_million',
            'output_price_eur_per_million',
            'cache_read_price_eur_per_million',
            'cache_write_price_eur_per_million',
            'reasoning_effort',
            'timeout_ms',
          ],
        })
      );
      return modelSettingsRowSchema.parse(record);
    },
  };
}
