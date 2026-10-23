import type { AnalyticsEnvironment } from '@portfolio/cms-schema';

export type AccountEnvironment = {
  email: string;
  password: string;
  token: string | null;
  roleId: string;
};

export type DatabaseEnvironment = {
  host: string;
  port: number;
  password: string;
};

export type ProvisionEnvironment = {
  directusUrl: string;
  adminToken: string;
  database: DatabaseEnvironment;
  analyticsEnvironment: AnalyticsEnvironment;
  owner: AccountEnvironment & { enforceTfa: boolean };
  assistant: AccountEnvironment & { appAccess: boolean };
  api: AccountEnvironment;
  mcpOAuth: { enabled: boolean; cimdEnabled: boolean; dcrEnabled: boolean };
  seedInitialContent: boolean;
};

type EnvironmentSource = Record<string, string | undefined>;

const analyticsEnvironments: readonly AnalyticsEnvironment[] = ['local', 'staging', 'prod'];

export function readProvisionEnvironment(source: EnvironmentSource): ProvisionEnvironment {
  return {
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    adminToken: requireValue(source, 'ADMIN_TOKEN'),
    database: readDatabase(source),
    analyticsEnvironment: readAnalyticsEnvironment(source),
    owner: {
      ...readAccount(source, 'OWNER'),
      enforceTfa: readFlag(source, 'OWNER_ENFORCE_TFA'),
    },
    assistant: {
      ...readAccount(source, 'AI'),
      appAccess: readFlag(source, 'AI_APP_ACCESS'),
    },
    api: readAccountWithRequiredToken(source, 'API'),
    mcpOAuth: {
      enabled: readFlag(source, 'MCP_OAUTH_ENABLED'),
      cimdEnabled: readFlag(source, 'MCP_OAUTH_CIMD_ENABLED'),
      dcrEnabled: readFlag(source, 'MCP_OAUTH_DCR_ENABLED'),
    },
    seedInitialContent: readFlag(source, 'SEED_INITIAL_CONTENT'),
  };
}

function readDatabase(source: EnvironmentSource): DatabaseEnvironment {
  const port = Number.parseInt(requireValue(source, 'POSTGRES_PORT'), 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('The environment variable POSTGRES_PORT must be a port number.');
  }
  return {
    host: requireValue(source, 'POSTGRES_HOST'),
    port,
    password: requireValue(source, 'POSTGRES_PASSWORD'),
  };
}

function readAnalyticsEnvironment(source: EnvironmentSource): AnalyticsEnvironment {
  const value = requireValue(source, 'ANALYTICS_ENVIRONMENT').trim();
  const match = analyticsEnvironments.find((environment) => environment === value);
  if (match === undefined) {
    throw new Error(
      'The environment variable ANALYTICS_ENVIRONMENT must be local, staging or prod.'
    );
  }
  return match;
}

function readAccount(source: EnvironmentSource, prefix: string): AccountEnvironment {
  return {
    email: requireValue(source, `${prefix}_EMAIL`),
    password: requireValue(source, `${prefix}_PASSWORD`),
    token: optionalValue(source, `${prefix}_TOKEN`),
    roleId: requireValue(source, `${prefix}_ROLE_ID`),
  };
}

function readAccountWithRequiredToken(
  source: EnvironmentSource,
  prefix: string
): AccountEnvironment {
  const account = readAccount(source, prefix);
  if (account.token === null) {
    throw new Error(`The environment variable ${prefix}_TOKEN is required.`);
  }
  return account;
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

function readFlag(source: EnvironmentSource, name: string): boolean {
  return source[name] === 'true';
}
