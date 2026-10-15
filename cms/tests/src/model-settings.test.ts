import {
  updateItem,
  createItem,
  deleteItem,
  readItems,
  readSingleton,
  updateSingleton,
} from '@directus/sdk';
import {
  createDirectusModelSettingsSource,
  createModelSettingsReader,
} from '@portfolio/api/model-settings';
import { afterAll, describe, expect, it } from 'vitest';

import { adminClient, anonymousClient, assistantClient, ownerClient } from './support/clients.ts';
import { testEnvironment } from './support/environment.ts';
import { captureErrorCode } from './support/errors.ts';

const originalSettings = await adminClient.request(
  readSingleton('model_settings', {
    fields: [
      'configuration_source',
      'active_profile',
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

afterAll(async () => {
  await adminClient.request(updateSingleton('model_settings', originalSettings));
});

function readStatusAsApi() {
  return createModelSettingsReader({
    source: createDirectusModelSettingsSource(
      testEnvironment.directusUrl,
      testEnvironment.apiToken
    ),
    clock: () => new Date(),
    cacheTtlMilliseconds: 0,
    log: () => undefined,
  }).readStatus();
}

describe('chat model settings', () => {
  it('give the API the model chosen by the owner', async () => {
    await ownerClient.request(
      updateSingleton('model_settings', {
        configuration_source: 'legacy',
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        input_price_eur_per_million: 0,
        output_price_eur_per_million: 0,
        cache_read_price_eur_per_million: null,
        cache_write_price_eur_per_million: null,
        reasoning_effort: null,
        timeout_ms: 10_000,
      })
    );

    expect(await readStatusAsApi()).toEqual({
      status: 'configured',
      settings: {
        providerId: 'openrouter',
        profileId: null,
        configurationSource: 'legacy',
        configurationFingerprint: expect.any(String),
        maxInputBytes: 65536,
        maxOutputTokens: null,
        responseCacheEnabled: false,
        modelName: 'nvidia/nemotron-3-super-120b-a12b:free',
        inputPriceEurPerMillion: 0,
        cacheReadPriceEurPerMillion: 0,
        cacheWritePriceEurPerMillion: 0,
        outputPriceEurPerMillion: 0,
        reasoningEffort: null,
        timeoutMilliseconds: 10_000,
      },
    });
  });

  it('give the API the prompt cache prices and reasoning effort chosen by the owner', async () => {
    await ownerClient.request(
      updateSingleton('model_settings', {
        model: 'anthropic/claude-haiku-5.5',
        input_price_eur_per_million: 0.09,
        output_price_eur_per_million: 0.45,
        cache_read_price_eur_per_million: 0.009,
        cache_write_price_eur_per_million: 0.11,
        reasoning_effort: 'none',
        timeout_ms: 10_000,
      })
    );

    expect(await readStatusAsApi()).toMatchObject({
      settings: {
        cacheReadPriceEurPerMillion: 0.009,
        cacheWritePriceEurPerMillion: 0.11,
        reasoningEffort: 'none',
      },
    });
  });

  it('keep scripted replies when the owner clears the model', async () => {
    await ownerClient.request(updateSingleton('model_settings', { model: null }));

    expect(await readStatusAsApi()).toEqual({ status: 'disabled' });
  });

  it('name the field the API cannot use', async () => {
    await ownerClient.request(
      updateSingleton('model_settings', { model: 'mistral-small', timeout_ms: 30_000 })
    );

    expect(await readStatusAsApi()).toEqual({ status: 'invalid', fields: ['timeout_ms'] });
  });

  it('can be read but not changed by the assistant', async () => {
    await expect(
      assistantClient.request(readSingleton('model_settings', { fields: ['model'] }))
    ).resolves.toBeDefined();
    expect(
      await captureErrorCode(
        assistantClient.request(updateSingleton('model_settings', { model: 'other-model' }))
      )
    ).toBe('FORBIDDEN');
  });

  it('stay private to anonymous visitors', async () => {
    expect(await captureErrorCode(anonymousClient.request(readSingleton('model_settings')))).toBe(
      'FORBIDDEN'
    );
  });
});

it('keeps model profiles private and reads the selected profile atomically', async () => {
  const profile = await ownerClient.request(
    createItem('model_provider_profiles', {
      name: 'Integration profile',
      provider: 'openai',
      model: 'integration-model',
      input_price_eur_per_million: 0,
      output_price_eur_per_million: 0,
      cache_read_price_eur_per_million: null,
      cache_write_price_eur_per_million: null,
      reasoning_effort: null,
      timeout_ms: 1000,
    })
  );
  try {
    await ownerClient.request(
      updateSingleton('model_settings', {
        configuration_source: 'profile',
        active_profile: profile.id,
      })
    );
    expect(await readStatusAsApi()).toMatchObject({
      status: 'configured',
      settings: { profileId: profile.id, providerId: 'openai', modelName: 'integration-model' },
    });
    await expect(
      assistantClient.request(readItems('model_provider_profiles'))
    ).resolves.toBeDefined();
    expect(
      await captureErrorCode(anonymousClient.request(readItems('model_provider_profiles')))
    ).toBe('FORBIDDEN');
    expect(
      await captureErrorCode(
        assistantClient.request(
          createItem('model_provider_profiles', { name: 'Forbidden', provider: 'openai' })
        )
      )
    ).toBe('FORBIDDEN');
    await ownerClient.request(
      updateItem('model_provider_profiles', profile.id, {
        model: 'edited-model',
        reasoning_effort: 'low',
      })
    );
    expect(await readStatusAsApi()).toMatchObject({
      status: 'configured',
      settings: { modelName: 'edited-model', reasoningEffort: 'low' },
    });
    expect(
      await captureErrorCode(
        assistantClient.request(
          updateItem('model_provider_profiles', profile.id, { model: 'forbidden-edit' })
        )
      )
    ).toBe('FORBIDDEN');
    await adminClient.request(deleteItem('model_provider_profiles', profile.id));
    expect(
      await adminClient.request(readSingleton('model_settings', { fields: ['active_profile'] }))
    ).toMatchObject({ active_profile: null });
    expect(await readStatusAsApi()).toEqual({ status: 'disabled' });
  } finally {
    await adminClient.request(
      updateSingleton('model_settings', { configuration_source: 'legacy', active_profile: null })
    );
    const remaining = await adminClient.request(
      readItems('model_provider_profiles', { filter: { id: { _eq: profile.id } } })
    );
    if (remaining.length > 0)
      await adminClient.request(deleteItem('model_provider_profiles', profile.id));
  }
});
