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

const modelSource = {
  ...validSource,
  MODEL_API_BASE_URL: 'https://api.mistral.ai/v1/',
  MODEL_API_KEY: 'model-key',
  MODEL_NAME: 'mistral-small',
  MODEL_INPUT_PRICE_EUR_PER_MILLION: '0.2',
  MODEL_OUTPUT_PRICE_EUR_PER_MILLION: '0.6',
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
      model: null,
      smtp: null,
      searchConsole: null,
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

  it('reads optional Search Console settings with the default property', () => {
    const json =
      '{"client_email":"service@example.com","private_key":"key","token_uri":"https://oauth2.googleapis.com/token"}';
    expect(
      readApiEnvironment({ ...validSource, GOOGLE_SERVICE_ACCOUNT_JSON: json }).searchConsole
    ).toEqual({
      account: {
        client_email: 'service@example.com',
        private_key: 'key',
        token_uri: 'https://oauth2.googleapis.com/token',
      },
      property: 'sc-domain:nyhasinavalona.com',
    });
  });

  it('refuses a malformed service account without quoting it', () => {
    const malformed = '{"client_email":"service@example.com","private_key":"PRIVATE-KEY-MATERIAL"';
    const read = () =>
      readApiEnvironment({ ...validSource, GOOGLE_SERVICE_ACCOUNT_JSON: malformed });
    expect(read).toThrow('GOOGLE_SERVICE_ACCOUNT_JSON must be a Google service account JSON key');
    expect(read).not.toThrow('PRIVATE-KEY-MATERIAL');
  });

  it('refuses a service account without a private key', () => {
    const json =
      '{"client_email":"service@example.com","token_uri":"https://oauth2.googleapis.com/token"}';
    expect(() => readApiEnvironment({ ...validSource, GOOGLE_SERVICE_ACCOUNT_JSON: json })).toThrow(
      'GOOGLE_SERVICE_ACCOUNT_JSON'
    );
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

  it('reads the model configuration with defaults', () => {
    expect(readApiEnvironment(modelSource).model).toEqual({
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: 'model-key',
      modelName: 'mistral-small',
      inputPriceEurPerMillion: 0.2,
      outputPriceEurPerMillion: 0.6,
      monthlyBudgetEur: 5,
      dailyCallLimit: 2000,
    });
  });

  it('leaves model mode disabled when unset', () => {
    expect(readApiEnvironment(validSource).model).toBeNull();
  });

  it('leaves model mode disabled when only the budget and the daily limit are set', () => {
    const deployedWithoutModel = {
      ...validSource,
      MONTHLY_MODEL_BUDGET_EUR: '5',
      MODEL_DAILY_CALL_LIMIT: '2000',
    };

    expect(readApiEnvironment(deployedWithoutModel).model).toBeNull();
  });

  it('reads the budget and the daily limit when model mode is configured', () => {
    const configured = {
      ...modelSource,
      MONTHLY_MODEL_BUDGET_EUR: '3.5',
      MODEL_DAILY_CALL_LIMIT: '500',
    };

    expect(readApiEnvironment(configured).model).toMatchObject({
      monthlyBudgetEur: 3.5,
      dailyCallLimit: 500,
    });
  });

  it('requires the full model group when one value is set', () => {
    expect(() => readApiEnvironment({ ...validSource, MODEL_API_KEY: 'only-key' })).toThrow(
      'MODEL_API_BASE_URL'
    );
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
