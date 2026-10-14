import { describe, expect, it } from 'vitest';

import { readApiEnvironment } from './environment.ts';

const validSource = {
  API_PORT: '8066',
  API_INTERNAL_PORT: '8067',
  DIRECTUS_URL: 'http://localhost:8065',
  API_TOKEN: 'api-token',
  PUBLICATION_HOOK_SECRET: 'hook-secret',
  CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
};

const siteBuildSource = {
  ...validSource,
  SITE_BUILD_ENVIRONMENT: 'staging',
  SITE_BUILD_REPOSITORY: 'ny-randriantsarafara/ny-randriantsarafara',
  SITE_BUILD_TOKEN: 'github-token',
};

const modelProviderSource = {
  ...validSource,
  MODEL_API_BASE_URL: 'https://api.mistral.ai/v1/',
  MODEL_API_KEY: 'model-key',
};

const smtpSource = {
  ...validSource,
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: 'owner@gmail.com',
  SMTP_PASSWORD: 'smtp-secret',
  CONTACT_RECIPIENT: 'owner@gmail.com',
};

describe('readApiEnvironment', () => {
  it('reads the API settings', () => {
    expect(readApiEnvironment(validSource)).toEqual({
      port: 8066,
      internalPort: 8067,
      directusUrl: 'http://localhost:8065',
      directusToken: 'api-token',
      hookSecret: 'hook-secret',
      corsAllowedOrigins: ['http://localhost:3000'],
      siteBuild: null,
      modelProvider: null,
      smtp: null,
    });
  });

  it('rejects a non-numeric port', () => {
    expect(() => readApiEnvironment({ ...validSource, API_PORT: 'abc' })).toThrow('API_PORT');
  });

  it('rejects a port outside the allowed range', () => {
    expect(() => readApiEnvironment({ ...validSource, API_PORT: '70000' })).toThrow('API_PORT');
  });

  it('requires the internal port', () => {
    expect(() => readApiEnvironment({ ...validSource, API_INTERNAL_PORT: '' })).toThrow(
      'API_INTERNAL_PORT'
    );
  });

  it('refuses an internal port equal to the public port', () => {
    expect(() => readApiEnvironment({ ...validSource, API_INTERNAL_PORT: '8066' })).toThrow(
      'API_INTERNAL_PORT must differ from API_PORT'
    );
  });

  it('names a missing required variable', () => {
    expect(() => readApiEnvironment({ ...validSource, API_TOKEN: '' })).toThrow('API_TOKEN');
  });

  it('requires CORS origins', () => {
    expect(() => readApiEnvironment({ ...validSource, CORS_ALLOWED_ORIGINS: '' })).toThrow(
      'CORS_ALLOWED_ORIGINS'
    );
  });

  it('parses comma-separated CORS origins', () => {
    expect(
      readApiEnvironment({
        ...validSource,
        CORS_ALLOWED_ORIGINS: 'https://a.example, https://b.example ',
      }).corsAllowedOrigins
    ).toEqual(['https://a.example', 'https://b.example']);
  });

  it('rejects CORS origins with a path', () => {
    expect(() =>
      readApiEnvironment({ ...validSource, CORS_ALLOWED_ORIGINS: 'https://example.com/chat' })
    ).toThrow('CORS_ALLOWED_ORIGINS');
  });

  it('reads the site build settings', () => {
    expect(readApiEnvironment(siteBuildSource).siteBuild).toEqual({
      repository: 'ny-randriantsarafara/ny-randriantsarafara',
      environment: 'staging',
      token: 'github-token',
    });
  });

  it('keeps site builds configured without a token', () => {
    expect(readApiEnvironment({ ...siteBuildSource, SITE_BUILD_TOKEN: '' }).siteBuild).toEqual({
      repository: 'ny-randriantsarafara/ny-randriantsarafara',
      environment: 'staging',
      token: null,
    });
  });

  it('requires the site build environment when a token is set', () => {
    expect(() => readApiEnvironment({ ...validSource, SITE_BUILD_TOKEN: 'github-token' })).toThrow(
      'SITE_BUILD_ENVIRONMENT is required'
    );
  });

  it('refuses an unknown site build environment', () => {
    expect(() =>
      readApiEnvironment({ ...siteBuildSource, SITE_BUILD_ENVIRONMENT: 'preview' })
    ).toThrow('SITE_BUILD_ENVIRONMENT must be staging or production');
  });

  it.each(['', 'not-a-repository', 'owner/name/extra'])(
    'refuses the site build repository "%s"',
    (repository) => {
      expect(() =>
        readApiEnvironment({ ...siteBuildSource, SITE_BUILD_REPOSITORY: repository })
      ).toThrow('SITE_BUILD_REPOSITORY');
    }
  );

  it('reads the model provider with defaults', () => {
    expect(readApiEnvironment(modelProviderSource).modelProvider).toEqual({
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: 'model-key',
      monthlyBudgetEur: 5,
      dailyCallLimit: 2000,
    });
  });

  it('leaves model mode disabled when unset', () => {
    expect(readApiEnvironment(validSource).modelProvider).toBeNull();
  });

  it('leaves model mode disabled when only the budget and the daily limit are set', () => {
    const deployedWithoutModel = {
      ...validSource,
      MONTHLY_MODEL_BUDGET_EUR: '5',
      MODEL_DAILY_CALL_LIMIT: '2000',
    };

    expect(readApiEnvironment(deployedWithoutModel).modelProvider).toBeNull();
  });

  it('reads the budget and the daily limit when a model provider is configured', () => {
    const configured = {
      ...modelProviderSource,
      MONTHLY_MODEL_BUDGET_EUR: '3.5',
      MODEL_DAILY_CALL_LIMIT: '500',
    };

    expect(readApiEnvironment(configured).modelProvider).toMatchObject({
      monthlyBudgetEur: 3.5,
      dailyCallLimit: 500,
    });
  });

  it('requires the base URL when the key is set', () => {
    expect(() => readApiEnvironment({ ...validSource, MODEL_API_KEY: 'only-key' })).toThrow(
      'MODEL_API_BASE_URL is required when MODEL_API_KEY is set.'
    );
  });

  it('requires the key when the base URL is set', () => {
    expect(() =>
      readApiEnvironment({ ...validSource, MODEL_API_BASE_URL: 'https://openrouter.ai/api/v1' })
    ).toThrow('MODEL_API_KEY is required when MODEL_API_BASE_URL is set.');
  });

  it('reads SMTP settings with a default sender', () => {
    expect(readApiEnvironment(smtpSource).smtp).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'owner@gmail.com',
      password: 'smtp-secret',
      contactRecipient: 'owner@gmail.com',
      contactSender: 'owner@gmail.com',
    });
  });

  it('uses CONTACT_SENDER when set', () => {
    expect(
      readApiEnvironment({ ...smtpSource, CONTACT_SENDER: 'noreply@example.com' }).smtp
        ?.contactSender
    ).toBe('noreply@example.com');
  });
});
