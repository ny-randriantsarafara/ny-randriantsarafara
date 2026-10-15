import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDirectusModelSettingsSource } from './directus-model-settings-source.ts';

function stubDirectusResponse(body: object, status: number) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    Response.json(body, { status, headers: { 'Content-Type': 'application/json' } })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createDirectusModelSettingsSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the model settings singleton with the API token', async () => {
    const row = {
      model: 'mistral-small',
      input_price_eur_per_million: 0.2,
      output_price_eur_per_million: 0.6,
      cache_read_price_eur_per_million: 0.02,
      cache_write_price_eur_per_million: null,
      reasoning_effort: 'none',
      timeout_ms: 8_000,
    };
    const fetchMock = stubDirectusResponse({ data: row }, 200);
    const source = createDirectusModelSettingsSource('http://directus.test', 'api-token');

    expect(await source.readSettings()).toEqual({ ...row, configuration_source: 'legacy' });
    const requestedUrl = fetchMock.mock.calls.at(0)?.at(0);
    expect(String(requestedUrl)).toMatch(/^http:\/\/directus\.test\/items\/model_settings\?/);
  });

  it('reads a singleton the owner never saved as empty settings', async () => {
    stubDirectusResponse({ data: {} }, 200);
    const source = createDirectusModelSettingsSource('http://directus.test', 'api-token');

    expect(await source.readSettings()).toEqual({
      configuration_source: 'legacy',
      model: null,
      input_price_eur_per_million: null,
      output_price_eur_per_million: null,
      cache_read_price_eur_per_million: null,
      cache_write_price_eur_per_million: null,
      reasoning_effort: null,
      timeout_ms: null,
    });
  });

  it('rejects a Directus error response', async () => {
    stubDirectusResponse(
      { errors: [{ message: "You don't have permission to access this." }] },
      403
    );
    const source = createDirectusModelSettingsSource('http://directus.test', 'api-token');

    await expect(source.readSettings()).rejects.toBeDefined();
  });

  it('rejects a row with an unexpected shape', async () => {
    stubDirectusResponse({ data: { model: 'mistral-small', timeout_ms: '8000' } }, 200);
    const source = createDirectusModelSettingsSource('http://directus.test', 'api-token');

    await expect(source.readSettings()).rejects.toThrow();
  });
});

describe('provider snapshot validation', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('rejects an unknown configuration source at the Directus boundary', async () => {
    stubDirectusResponse({ data: { configuration_source: 'surprise' } }, 200);
    await expect(
      createDirectusModelSettingsSource('http://directus.test', 'token').readSettings()
    ).rejects.toThrow();
  });
  it('rejects a raw relation identifier instead of silently reading legacy', async () => {
    stubDirectusResponse({ data: { configuration_source: 'profile', active_profile: 'id' } }, 200);
    await expect(
      createDirectusModelSettingsSource('http://directus.test', 'token').readSettings()
    ).rejects.toThrow();
  });
});
