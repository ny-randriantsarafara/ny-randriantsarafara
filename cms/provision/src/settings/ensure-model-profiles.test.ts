import { afterEach, expect, it, vi } from 'vitest';
import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { ensureModelProfiles, migratedModelProfileId } from './ensure-model-profiles.ts';
afterEach(() => vi.unstubAllGlobals());
it('preserves an existing migrated profile without reading or overwriting legacy', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ data: [{ id: migratedModelProfileId }] }));
  vi.stubGlobal('fetch', fetchImpl);
  await ensureModelProfiles(
    createDirectus<PortfolioSchema>('http://directus.test', { globals: { fetch: fetchImpl } })
      .with(staticToken('token'))
      .with(rest()),
    () => undefined
  );
  expect(fetchImpl).toHaveBeenCalledOnce();
  expect(String(fetchImpl.mock.calls.at(0)?.at(0))).toContain('model_provider_profiles');
});
it('does not migrate disabled legacy settings', async () => {
  let calls = 0;
  const fetchImpl = vi.fn(async () =>
    Response.json({ data: calls++ === 0 ? [] : { model: null } })
  );
  vi.stubGlobal('fetch', fetchImpl);
  await ensureModelProfiles(
    createDirectus<PortfolioSchema>('http://directus.test', { globals: { fetch: fetchImpl } })
      .with(staticToken('token'))
      .with(rest()),
    () => undefined
  );
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

it('migrates valid legacy settings using the reserved id without selecting the profile', async () => {
  const requests: { method: string; body: unknown }[] = [];
  const legacy = {
    model: 'legacy-model',
    input_price_eur_per_million: 0,
    output_price_eur_per_million: 0,
    cache_read_price_eur_per_million: null,
    cache_write_price_eur_per_million: null,
    reasoning_effort: null,
    timeout_ms: 1000,
  };
  const fetchImpl: typeof fetch = async (_input, init) => {
    requests.push({
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    });
    return Response.json({
      data:
        requests.length === 1
          ? []
          : requests.length === 2
            ? legacy
            : { id: migratedModelProfileId },
    });
  };
  await ensureModelProfiles(
    createDirectus<PortfolioSchema>('http://directus.test', { globals: { fetch: fetchImpl } })
      .with(staticToken('token'))
      .with(rest()),
    () => undefined
  );
  expect(requests.map((request) => request.method)).toEqual(['GET', 'GET', 'POST']);
  expect(requests[2]?.body).toMatchObject({
    id: migratedModelProfileId,
    provider: 'openrouter',
    model: 'legacy-model',
    max_input_bytes: 65536,
    max_output_tokens: null,
    response_cache_enabled: false,
  });
});

it.each([
  { configuration_source: 'disabled' },
  { input_price_eur_per_million: -1 },
  { input_price_eur_per_million: null },
  { output_price_eur_per_million: -1 },
  { output_price_eur_per_million: null },
  { cache_read_price_eur_per_million: -1 },
  { cache_write_price_eur_per_million: -1 },
  { cache_read_price_eur_per_million: 'invalid' },
  { cache_write_price_eur_per_million: 'invalid' },
  { timeout_ms: '__infinity__' },
  { input_price_eur_per_million: '__infinity__' },
  { cache_read_price_eur_per_million: '__infinity__' },
  { max_input_bytes: '__infinity__' },
  { timeout_ms: 1000.5 },
  { timeout_ms: null },
  { timeout_ms: 'NaN' },
  { max_input_bytes: 0 },
  { max_input_bytes: null },
  { max_input_bytes: 1.5 },
  { max_output_tokens: 0 },
  { max_output_tokens: -1 },
  { max_output_tokens: 1.5 },
  { response_cache_enabled: null },
  { response_cache_enabled: 'true' },
])('does not migrate invalid or disabled legacy settings: %j', async (invalid) => {
  const legacy = {
    model: 'legacy-model',
    input_price_eur_per_million: 0,
    output_price_eur_per_million: 0,
    cache_read_price_eur_per_million: null,
    cache_write_price_eur_per_million: null,
    reasoning_effort: null,
    timeout_ms: 1000,
    ...invalid,
  };
  let calls = 0;
  const fetchImpl = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({ data: calls++ === 0 ? [] : legacy }).replaceAll('"__infinity__"', '1e999'),
        { headers: { 'Content-Type': 'application/json' } }
      )
  );
  await ensureModelProfiles(
    createDirectus<PortfolioSchema>('http://directus.test', { globals: { fetch: fetchImpl } })
      .with(staticToken('token'))
      .with(rest()),
    () => undefined
  );
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});
