import { describe, expect, it } from 'vitest';

import { readApiEnvironment } from './environment.ts';

const validSource = {
  API_PORT: '8066',
  API_INTERNAL_PORT: '8067',
  DIRECTUS_URL: 'http://localhost:8065',
  API_TOKEN: 'api-token',
  PUBLICATION_HOOK_SECRET: 'hook-secret',
};

const siteBuildSource = {
  ...validSource,
  SITE_BUILD_ENVIRONMENT: 'staging',
  SITE_BUILD_REPOSITORY: 'ny-randriantsarafara/ny-randriantsarafara',
  SITE_BUILD_TOKEN: 'github-token',
};

describe('readApiEnvironment', () => {
  it('reads the API settings', () => {
    expect(readApiEnvironment(validSource)).toEqual({
      port: 8066,
      internalPort: 8067,
      directusUrl: 'http://localhost:8065',
      directusToken: 'api-token',
      hookSecret: 'hook-secret',
      siteBuild: null,
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
});
