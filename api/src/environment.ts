import type { ModelProviderCredentials } from './chat/model-provider.ts';

export type SiteEnvironment = 'staging' | 'production';

export type SiteBuildConfiguration = {
  repository: string;
  environment: SiteEnvironment;
  token: string | null;
};

export type ModelProviderConfiguration = {
  baseUrl: string;
  apiKey: string;
  monthlyBudgetEur: number;
  dailyCallLimit: number;
};

export type ModelRuntimeConfiguration = {
  credentials: ModelProviderCredentials;
  monthlyBudgetEur: number;
  dailyCallLimit: number;
  legacy: ModelProviderConfiguration | null;
};

export type SmtpConfiguration = {
  host: string;
  port: number;
  user: string;
  password: string;
  contactRecipient: string;
  contactSender: string;
};

export type ApiEnvironment = {
  analyticsEnvironment: 'local' | 'staging' | 'prod';
  port: number;
  internalPort: number;
  directusUrl: string;
  directusToken: string;
  hookSecret: string;
  corsAllowedOrigins: string[];
  siteBuild: SiteBuildConfiguration | null;
  modelProvider: ModelProviderConfiguration | null;
  modelRuntime: ModelRuntimeConfiguration | null;
  smtp: SmtpConfiguration | null;
};

type EnvironmentSource = Record<string, string | undefined>;

const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const originPattern = /^https?:\/\/[^/?#]+$/;

export function readApiEnvironment(source: EnvironmentSource): ApiEnvironment {
  const port = readPort(source, 'API_PORT');
  const internalPort = readPort(source, 'API_INTERNAL_PORT');
  if (internalPort === port) {
    throw new Error(
      'API_INTERNAL_PORT must differ from API_PORT: only API_PORT is routed publicly.'
    );
  }
  return {
    analyticsEnvironment: readAnalyticsEnvironment(source),
    port,
    internalPort,
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    directusToken: requireValue(source, 'API_TOKEN'),
    hookSecret: requireValue(source, 'PUBLICATION_HOOK_SECRET'),
    corsAllowedOrigins: readCorsAllowedOrigins(source),
    siteBuild: readSiteBuild(source),
    modelProvider: readModelProviderConfiguration(source),
    modelRuntime: readModelRuntime(source),
    smtp: readSmtpConfiguration(source),
  };
}

function readCorsAllowedOrigins(source: EnvironmentSource): string[] {
  const raw = requireValue(source, 'CORS_ALLOWED_ORIGINS');
  const origins = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (origins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must list at least one origin.');
  }
  const invalid = origins.filter((origin) => !originPattern.test(origin));
  if (invalid.length > 0) {
    throw new Error(
      `CORS_ALLOWED_ORIGINS entries must be http(s) origins without a path (invalid: "${invalid[0]}").`
    );
  }
  return origins;
}

// The model itself, its prices and its timeout are chosen in the CMS (model_settings).
function readModelProviderConfiguration(
  source: EnvironmentSource
): ModelProviderConfiguration | null {
  const baseUrl = optionalValue(source, 'MODEL_API_BASE_URL');
  const apiKey = optionalValue(source, 'MODEL_API_KEY');
  // The budget and the daily limit have defaults and are always deployed: they do not enable model mode.
  const monthlyBudget = optionalValue(source, 'MONTHLY_MODEL_BUDGET_EUR');
  const dailyLimit = optionalValue(source, 'MODEL_DAILY_CALL_LIMIT');
  if (baseUrl === null && apiKey === null) {
    return null;
  }
  if (baseUrl === null) {
    throw new Error('MODEL_API_BASE_URL is required when MODEL_API_KEY is set.');
  }
  if (apiKey === null) {
    throw new Error('MODEL_API_KEY is required when MODEL_API_BASE_URL is set.');
  }
  return {
    baseUrl: trimTrailingSlash(baseUrl),
    apiKey,
    monthlyBudgetEur: readPositiveNumber(monthlyBudget ?? '5', 'MONTHLY_MODEL_BUDGET_EUR'),
    dailyCallLimit: readPositiveInteger(dailyLimit ?? '2000', 'MODEL_DAILY_CALL_LIMIT'),
  };
}

function readSmtpConfiguration(source: EnvironmentSource): SmtpConfiguration | null {
  const host = optionalValue(source, 'SMTP_HOST');
  const port = optionalValue(source, 'SMTP_PORT');
  const user = optionalValue(source, 'SMTP_USER');
  const password = optionalValue(source, 'SMTP_PASSWORD');
  const contactRecipient = optionalValue(source, 'CONTACT_RECIPIENT');
  const contactSender = optionalValue(source, 'CONTACT_SENDER');
  if (
    host === null &&
    port === null &&
    user === null &&
    password === null &&
    contactRecipient === null &&
    contactSender === null
  ) {
    return null;
  }
  if (host === null) {
    throw new Error('SMTP_HOST is required when any SMTP setting is set.');
  }
  if (port === null) {
    throw new Error('SMTP_PORT is required when any SMTP setting is set.');
  }
  if (user === null) {
    throw new Error('SMTP_USER is required when any SMTP setting is set.');
  }
  if (password === null) {
    throw new Error('SMTP_PASSWORD is required when any SMTP setting is set.');
  }
  if (contactRecipient === null) {
    throw new Error('CONTACT_RECIPIENT is required when any SMTP setting is set.');
  }
  const resolvedSender = contactSender ?? user;
  return {
    host,
    port: readPositiveInteger(port, 'SMTP_PORT'),
    user,
    password,
    contactRecipient,
    contactSender: resolvedSender,
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
  return readPositiveInteger(raw, name);
}

function readPositiveInteger(raw: string, name: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535 (received "${raw}").`);
  }
  return parsed;
}

function readPositiveNumber(raw: string, name: string): number {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number (received "${raw}").`);
  }
  return parsed;
}

function trimTrailingSlash(value: string): string {
  if (value.endsWith('/')) {
    return value.slice(0, -1);
  }
  return value;
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

function readModelRuntime(source: EnvironmentSource): ModelRuntimeConfiguration | null {
  const legacy = readModelProviderConfiguration(source);
  const credentials: ModelProviderCredentials = {};
  const openrouter =
    optionalValue(source, 'OPENROUTER_API_KEY') ??
    (legacy?.baseUrl === 'https://openrouter.ai/api/v1' ? legacy.apiKey : null);
  const gemini = optionalValue(source, 'GEMINI_API_KEY');
  const openai = optionalValue(source, 'OPENAI_API_KEY');
  if (openrouter !== null) credentials.openrouter = { apiKey: openrouter };
  if (gemini !== null) credentials['google-ai-studio'] = { apiKey: gemini };
  if (openai !== null) credentials.openai = { apiKey: openai };
  if (legacy === null && Object.keys(credentials).length === 0) return null;
  return {
    credentials,
    legacy,
    monthlyBudgetEur: readPositiveNumber(
      optionalValue(source, 'MONTHLY_MODEL_BUDGET_EUR') ?? '5',
      'MONTHLY_MODEL_BUDGET_EUR'
    ),
    dailyCallLimit: readPositiveInteger(
      optionalValue(source, 'MODEL_DAILY_CALL_LIMIT') ?? '2000',
      'MODEL_DAILY_CALL_LIMIT'
    ),
  };
}

function readAnalyticsEnvironment(source: EnvironmentSource): 'local' | 'staging' | 'prod' {
  const value = source.ANALYTICS_ENVIRONMENT ?? 'local';
  if (value === 'local' || value === 'staging' || value === 'prod') return value;
  throw new Error('ANALYTICS_ENVIRONMENT must be local, staging or prod.');
}
