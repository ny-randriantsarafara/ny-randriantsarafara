import { describe, expect, it } from 'vitest';

import { readApiEnvironment } from './environment.ts';

const validSource = {
  API_PORT: '8066',
  DIRECTUS_URL: 'http://localhost:8065',
  API_TOKEN: 'api-token',
  PUBLICATION_HOOK_SECRET: 'hook-secret',
};

describe('readApiEnvironment', () => {
  it('reads the API settings', () => {
    expect(readApiEnvironment(validSource)).toEqual({
      port: 8066,
      directusUrl: 'http://localhost:8065',
      directusToken: 'api-token',
      hookSecret: 'hook-secret',
    });
  });

  it('rejects a non-numeric port', () => {
    expect(() => readApiEnvironment({ ...validSource, API_PORT: 'abc' })).toThrow('API_PORT');
  });

  it('rejects a port outside the allowed range', () => {
    expect(() => readApiEnvironment({ ...validSource, API_PORT: '70000' })).toThrow('API_PORT');
  });

  it('names a missing required variable', () => {
    expect(() => readApiEnvironment({ ...validSource, API_TOKEN: '' })).toThrow('API_TOKEN');
  });
});
