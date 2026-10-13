export type AccountEnvironment = {
  email: string;
  password: string;
  token: string | null;
  roleId: string;
};

export type ProvisionEnvironment = {
  directusUrl: string;
  adminToken: string;
  owner: AccountEnvironment & { enforceTfa: boolean };
  assistant: AccountEnvironment & { appAccess: boolean };
  api: AccountEnvironment;
  mcpOAuth: { enabled: boolean; cimdEnabled: boolean; dcrEnabled: boolean };
  seedInitialContent: boolean;
};

type EnvironmentSource = Record<string, string | undefined>;

export function readProvisionEnvironment(source: EnvironmentSource): ProvisionEnvironment {
  return {
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    adminToken: requireValue(source, 'ADMIN_TOKEN'),
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
