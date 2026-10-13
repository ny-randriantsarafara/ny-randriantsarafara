import { describe, expect, it } from 'vitest';

import { readProvisionEnvironment } from './environment.ts';

const requiredSource = {
  DIRECTUS_URL: 'http://localhost:8065',
  ADMIN_TOKEN: 'admin-token',
  OWNER_EMAIL: 'owner@example.com',
  OWNER_PASSWORD: 'owner-password',
  OWNER_ROLE_ID: 'owner-role',
  AI_EMAIL: 'assistant@example.com',
  AI_PASSWORD: 'assistant-password',
  AI_ROLE_ID: 'assistant-role',
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
});
