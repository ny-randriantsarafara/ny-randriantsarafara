import { describe, expect, it } from 'vitest';

import { readProvisionEnvironment } from './environment.ts';

const requiredSource = {
  DIRECTUS_URL: 'http://localhost:8065',
  ADMIN_TOKEN: 'admin-token',
  POSTGRES_HOST: 'database',
  POSTGRES_PORT: '5432',
  POSTGRES_PASSWORD: 'postgres-password',
  ANALYTICS_ENVIRONMENT: 'staging',
  OWNER_EMAIL: 'owner@example.com',
  OWNER_PASSWORD: 'owner-password',
  OWNER_ROLE_ID: 'owner-role',
  AI_EMAIL: 'assistant@example.com',
  AI_PASSWORD: 'assistant-password',
  AI_ROLE_ID: 'assistant-role',
  API_EMAIL: 'api@example.com',
  API_PASSWORD: 'api-password',
  API_TOKEN: 'api-token',
  API_ROLE_ID: 'api-role',
};

describe('readProvisionEnvironment', () => {
  it('reads the accounts and treats absent flags as false', () => {
    const environment = readProvisionEnvironment(requiredSource);

    expect(environment.owner).toEqual({
      email: 'owner@example.com',
      password: 'owner-password',
      token: null,
      roleId: 'owner-role',
      enforceTfa: false,
    });
    expect(environment.assistant.appAccess).toBe(false);
    expect(environment.seedInitialContent).toBe(false);
    expect(environment.mcpOAuth).toEqual({ enabled: false, cimdEnabled: false, dcrEnabled: false });
  });

  it('reads flags set to true', () => {
    const environment = readProvisionEnvironment({
      ...requiredSource,
      OWNER_ENFORCE_TFA: 'true',
      SEED_INITIAL_CONTENT: 'true',
      MCP_OAUTH_ENABLED: 'true',
    });

    expect(environment.owner.enforceTfa).toBe(true);
    expect(environment.seedInitialContent).toBe(true);
    expect(environment.mcpOAuth.enabled).toBe(true);
  });

  it('treats a blank token as absent', () => {
    expect(readProvisionEnvironment({ ...requiredSource, AI_TOKEN: '  ' }).assistant.token).toBe(
      null
    );
  });

  it('names a missing required variable', () => {
    expect(() => readProvisionEnvironment({ ...requiredSource, OWNER_ROLE_ID: '' })).toThrow(
      'OWNER_ROLE_ID'
    );
  });

  it('requires the API token', () => {
    expect(() => readProvisionEnvironment({ ...requiredSource, API_TOKEN: '' })).toThrow(
      'API_TOKEN'
    );
  });

  it('reads the database connection and the analytics environment', () => {
    const environment = readProvisionEnvironment(requiredSource);

    expect(environment.database).toEqual({
      host: 'database',
      port: 5432,
      password: 'postgres-password',
    });
    expect(environment.analyticsEnvironment).toBe('staging');
  });

  it('requires the analytics environment instead of assuming local', () => {
    expect(() =>
      readProvisionEnvironment({ ...requiredSource, ANALYTICS_ENVIRONMENT: '' })
    ).toThrow('ANALYTICS_ENVIRONMENT');
  });

  it('refuses an unknown analytics environment', () => {
    expect(() =>
      readProvisionEnvironment({ ...requiredSource, ANALYTICS_ENVIRONMENT: 'production' })
    ).toThrow('ANALYTICS_ENVIRONMENT must be local, staging or prod');
  });

  it('refuses a database port that is not a number', () => {
    expect(() => readProvisionEnvironment({ ...requiredSource, POSTGRES_PORT: 'five' })).toThrow(
      'POSTGRES_PORT'
    );
  });
});
