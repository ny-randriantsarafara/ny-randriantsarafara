import { createItem, readItems, readSingleton } from '@directus/sdk';
import type { AdminClient, Log } from '../directus-client.ts';

export const migratedModelProfileId = 'c4a040b6-e4a0-5b9a-8134-98be450983d2';
export async function ensureModelProfiles(client: AdminClient, log: Log): Promise<void> {
  const existing = await client.request(
    readItems('model_provider_profiles', {
      filter: { id: { _eq: migratedModelProfileId } },
      limit: 1,
    })
  );
  if (existing.length > 0) return;
  const legacy = await client.request(readSingleton('model_settings'));
  if (
    legacy.configuration_source === 'disabled' ||
    (legacy.configuration_source !== undefined &&
      legacy.configuration_source !== 'legacy' &&
      legacy.configuration_source !== 'profile') ||
    typeof legacy.model !== 'string' ||
    legacy.model.trim() === '' ||
    !isPrice(legacy.input_price_eur_per_million) ||
    !isPrice(legacy.output_price_eur_per_million) ||
    !isNullablePrice(legacy.cache_read_price_eur_per_million) ||
    !isNullablePrice(legacy.cache_write_price_eur_per_million) ||
    !isPositiveInteger(legacy.timeout_ms) ||
    legacy.timeout_ms < 1000 ||
    legacy.timeout_ms > 10000 ||
    (legacy.max_input_bytes !== undefined && !isPositiveInteger(legacy.max_input_bytes)) ||
    (legacy.max_output_tokens !== undefined &&
      legacy.max_output_tokens !== null &&
      !isPositiveInteger(legacy.max_output_tokens)) ||
    (legacy.response_cache_enabled !== undefined &&
      typeof legacy.response_cache_enabled !== 'boolean') ||
    (legacy.reasoning_effort !== null &&
      !['none', 'low', 'medium', 'high'].includes(legacy.reasoning_effort))
  )
    return;
  await client.request(
    createItem('model_provider_profiles', {
      id: migratedModelProfileId,
      name: 'Migrated legacy configuration',
      provider: 'openrouter',
      model: legacy.model,
      input_price_eur_per_million: legacy.input_price_eur_per_million,
      output_price_eur_per_million: legacy.output_price_eur_per_million,
      cache_read_price_eur_per_million: legacy.cache_read_price_eur_per_million,
      cache_write_price_eur_per_million: legacy.cache_write_price_eur_per_million,
      reasoning_effort: legacy.reasoning_effort,
      timeout_ms: legacy.timeout_ms,
      max_input_bytes: legacy.max_input_bytes ?? 65536,
      max_output_tokens: legacy.max_output_tokens ?? null,
      response_cache_enabled: legacy.response_cache_enabled ?? false,
    })
  );
  log('Saved legacy model profile without changing the active configuration');
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function isNullablePrice(value: unknown): boolean {
  return value === null || isPrice(value);
}
function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
