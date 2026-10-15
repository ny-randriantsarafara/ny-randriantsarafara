import { describe, expect, it, vi } from 'vitest';

import {
  createModelSettingsReader,
  resolveModelSettings,
  type ModelSettingsRow,
} from './model-settings.ts';

const configuredRow: ModelSettingsRow = {
  model: 'nvidia/nemotron-3-super-120b-a12b:free',
  input_price_eur_per_million: 0,
  output_price_eur_per_million: 0,
  cache_read_price_eur_per_million: null,
  cache_write_price_eur_per_million: null,
  reasoning_effort: null,
  timeout_ms: 10_000,
};

describe('resolveModelSettings', () => {
  it('maps a complete row', () => {
    expect(
      resolveModelSettings({
        model: 'mistral-small',
        input_price_eur_per_million: 0.2,
        output_price_eur_per_million: 0.6,
        cache_read_price_eur_per_million: 0.02,
        cache_write_price_eur_per_million: 0.25,
        reasoning_effort: 'low',
        timeout_ms: 8_000,
      })
    ).toEqual({
      status: 'configured',
      settings: {
        configurationSource: 'legacy',
        providerId: 'openrouter',
        profileId: null,
        configurationFingerprint: expect.any(String),
        maxInputBytes: 65536,
        maxOutputTokens: null,
        responseCacheEnabled: false,
        modelName: 'mistral-small',
        inputPriceEurPerMillion: 0.2,
        cacheReadPriceEurPerMillion: 0.02,
        cacheWritePriceEurPerMillion: 0.25,
        outputPriceEurPerMillion: 0.6,
        reasoningEffort: 'low',
        timeoutMilliseconds: 8_000,
      },
    });
  });

  it('leaves the reasoning effort to the model when none is chosen', () => {
    expect(resolveModelSettings(configuredRow)).toMatchObject({
      settings: { reasoningEffort: null },
    });
  });

  it('bills the prompt cache at the input price when no cache price is set', () => {
    expect(
      resolveModelSettings({ ...configuredRow, input_price_eur_per_million: 0.09 })
    ).toMatchObject({
      settings: { cacheReadPriceEurPerMillion: 0.09, cacheWritePriceEurPerMillion: 0.09 },
    });
  });

  it('accepts a free model', () => {
    expect(resolveModelSettings(configuredRow).status).toBe('configured');
  });

  it('trims the model identifier', () => {
    expect(resolveModelSettings({ ...configuredRow, model: '  mistral-small ' })).toMatchObject({
      settings: { modelName: 'mistral-small' },
    });
  });

  it('disables the model when no model is chosen', () => {
    expect(resolveModelSettings({ ...configuredRow, model: null })).toEqual({
      status: 'disabled',
    });
    expect(resolveModelSettings({ ...configuredRow, model: '   ' })).toEqual({
      status: 'disabled',
    });
  });

  it('names the fields that are missing or out of range', () => {
    expect(
      resolveModelSettings({
        ...configuredRow,
        input_price_eur_per_million: null,
        output_price_eur_per_million: -1,
        cache_write_price_eur_per_million: -0.1,
        reasoning_effort: 'extreme',
      })
    ).toEqual({
      status: 'invalid',
      fields: [
        'input_price_eur_per_million',
        'output_price_eur_per_million',
        'cache_write_price_eur_per_million',
        'reasoning_effort',
      ],
    });
  });

  it('keeps the timeout under the site wait', () => {
    expect(resolveModelSettings({ ...configuredRow, timeout_ms: 1_000 }).status).toBe('configured');
    expect(resolveModelSettings({ ...configuredRow, timeout_ms: 999 })).toEqual({
      status: 'invalid',
      fields: ['timeout_ms'],
    });
    expect(resolveModelSettings({ ...configuredRow, timeout_ms: 10_001 })).toEqual({
      status: 'invalid',
      fields: ['timeout_ms'],
    });
    expect(resolveModelSettings({ ...configuredRow, timeout_ms: 2_500.5 })).toEqual({
      status: 'invalid',
      fields: ['timeout_ms'],
    });
  });
});

describe('createModelSettingsReader', () => {
  it('caches the settings for the configured time', async () => {
    const source = { readSettings: vi.fn(async () => configuredRow) };
    const clock = { now: 0 };
    const reader = createModelSettingsReader({
      source,
      clock: () => new Date(clock.now),
      cacheTtlMilliseconds: 30_000,
      log: () => undefined,
    });

    expect((await reader.readStatus()).status).toBe('configured');
    clock.now = 29_999;
    expect((await reader.readStatus()).status).toBe('configured');
    expect(source.readSettings).toHaveBeenCalledTimes(1);
  });

  it('applies a change once the cache expires', async () => {
    const source = {
      readSettings: vi
        .fn<() => Promise<ModelSettingsRow>>()
        .mockResolvedValueOnce(configuredRow)
        .mockResolvedValueOnce({ ...configuredRow, model: 'mistral-small' }),
    };
    const clock = { now: 0 };
    const reader = createModelSettingsReader({
      source,
      clock: () => new Date(clock.now),
      cacheTtlMilliseconds: 30_000,
      log: () => undefined,
    });

    await reader.readStatus();
    clock.now = 30_000;

    expect(await reader.readStatus()).toMatchObject({ settings: { modelName: 'mistral-small' } });
  });

  it('reports unavailable settings without caching the failure', async () => {
    const log = vi.fn();
    const source = {
      readSettings: vi
        .fn<() => Promise<ModelSettingsRow>>()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce(configuredRow),
    };
    const reader = createModelSettingsReader({
      source,
      clock: () => new Date(0),
      cacheTtlMilliseconds: 30_000,
      log,
    });

    expect(await reader.readStatus()).toEqual({ status: 'unavailable' });
    expect(log).toHaveBeenCalledWith(
      'Model settings unavailable: answering with scripted replies.'
    );
    expect((await reader.readStatus()).status).toBe('configured');
  });

  it('logs the invalid fields once per read', async () => {
    const log = vi.fn();
    const reader = createModelSettingsReader({
      source: { readSettings: async () => ({ ...configuredRow, timeout_ms: null }) },
      clock: () => new Date(0),
      cacheTtlMilliseconds: 30_000,
      log,
    });

    await reader.readStatus();
    await reader.readStatus();

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'Model settings invalid (timeout_ms): answering with scripted replies.'
    );
  });
});

it('disables a deleted active profile without restoring legacy', () => {
  expect(
    resolveModelSettings({
      configuration_source: 'profile',
      active_profile: null,
      model: 'legacy',
      input_price_eur_per_million: 0,
      output_price_eur_per_million: 0,
      cache_read_price_eur_per_million: null,
      cache_write_price_eur_per_million: null,
      reasoning_effort: null,
      timeout_ms: 1000,
    })
  ).toEqual({ status: 'disabled' });
});
it('resolves the selected snapshot and invalidates its identity after edits', () => {
  const profile = {
    id: 'profile',
    name: 'My model',
    provider: 'openai',
    model: 'model-one',
    input_price_eur_per_million: 0,
    output_price_eur_per_million: 0,
    cache_read_price_eur_per_million: null,
    cache_write_price_eur_per_million: null,
    reasoning_effort: null,
    timeout_ms: 1000,
  };
  const row = { ...profile, configuration_source: 'profile', active_profile: profile };
  const first = resolveModelSettings({ ...row, configuration_source: 'profile' });
  const second = resolveModelSettings({
    ...row,
    configuration_source: 'profile',
    active_profile: { ...profile, model: 'model-two' },
  });
  expect(first).toMatchObject({
    status: 'configured',
    settings: {
      configurationSource: 'profile',
      providerId: 'openai',
      profileId: 'profile',
      modelName: 'model-one',
    },
  });
  if (first.status !== 'configured' || second.status !== 'configured')
    throw new Error('Expected profiles');
  expect(first.settings.configurationFingerprint).not.toBe(
    second.settings.configurationFingerprint
  );
});

it('accepts the minimal deleted-profile read shape', () => {
  expect(resolveModelSettings({ configuration_source: 'profile', active_profile: null })).toEqual({
    status: 'disabled',
  });
});
