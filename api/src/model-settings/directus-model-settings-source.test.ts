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
      timeout_ms: 8_000,
    };
    const fetchMock = stubDirectusResponse({ data: row }, 200);
    const source = createDirectusModelSettingsSource('http://directus.test', 'api-token');

    expect(await source.readSettings()).toEqual(row);
    const requestedUrl = fetchMock.mock.calls.at(0)?.at(0);
    expect(String(requestedUrl)).toMatch(/^http:\/\/directus\.test\/items\/model_settings\?/);
  });

  it('reads a singleton the owner never saved as empty settings', async () => {
    stubDirectusResponse({ data: {} }, 200);
    const source = createDirectusModelSettingsSource('http://directus.test', 'api-token');

    expect(await source.readSettings()).toEqual({
      model: null,
      input_price_eur_per_million: null,
      output_price_eur_per_million: null,
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
