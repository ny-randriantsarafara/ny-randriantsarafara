export type SiteEnvironment = 'staging' | 'production';

export type SiteBuildConfiguration = {
  repository: string;
  environment: SiteEnvironment;
  token: string | null;
};

export type ApiEnvironment = {
  port: number;
  internalPort: number;
  directusUrl: string;
  directusToken: string;
  hookSecret: string;
  siteBuild: SiteBuildConfiguration | null;
};

type EnvironmentSource = Record<string, string | undefined>;

const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function readApiEnvironment(source: EnvironmentSource): ApiEnvironment {
  const port = readPort(source, 'API_PORT');
  const internalPort = readPort(source, 'API_INTERNAL_PORT');
  if (internalPort === port) {
    throw new Error(
      'API_INTERNAL_PORT must differ from API_PORT: only API_PORT is routed publicly.'
    );
  }
  return {
    port,
    internalPort,
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    directusToken: requireValue(source, 'API_TOKEN'),
    hookSecret: requireValue(source, 'PUBLICATION_HOOK_SECRET'),
    siteBuild: readSiteBuild(source),
  };
}

function readSiteBuild(source: EnvironmentSource): SiteBuildConfiguration | null {
  const environment = optionalValue(source, 'SITE_BUILD_ENVIRONMENT');
  const repository = optionalValue(source, 'SITE_BUILD_REPOSITORY');
  const token = optionalValue(source, 'SITE_BUILD_TOKEN');
  if (environment === null && repository === null && token === null) {
    return null;
  }
  if (environment === null) {
    throw new Error(
      'SITE_BUILD_ENVIRONMENT is required when SITE_BUILD_REPOSITORY or SITE_BUILD_TOKEN is set.'
    );
  }
  if (!isSiteEnvironment(environment)) {
    throw new Error(
      `SITE_BUILD_ENVIRONMENT must be staging or production (received "${environment}").`
    );
  }
  if (repository === null || !repositoryPattern.test(repository)) {
    throw new Error('SITE_BUILD_REPOSITORY must name a GitHub repository as owner/name.');
  }
  return { repository, environment, token };
}

function isSiteEnvironment(value: string): value is SiteEnvironment {
  return value === 'staging' || value === 'production';
}

function readPort(source: EnvironmentSource, name: string): number {
  const raw = requireValue(source, name);
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535 (received "${raw}").`);
  }
  return parsed;
}

function requireValue(source: EnvironmentSource, name: string): string {
  const value = optionalValue(source, name);
  if (value === null) {
    throw new Error(`The environment variable ${name} is required.`);
  }
  return value;
}

function optionalValue(source: EnvironmentSource, name: string): string | null {
  const value = source[name];
  if (value === undefined || value.trim() === '') {
    return null;
  }
  return value;
}
