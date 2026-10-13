export type ApiEnvironment = {
  port: number;
  directusUrl: string;
  directusToken: string;
  hookSecret: string;
};

type EnvironmentSource = Record<string, string | undefined>;

export function readApiEnvironment(source: EnvironmentSource): ApiEnvironment {
  return {
    port: readPort(source),
    directusUrl: requireValue(source, 'DIRECTUS_URL'),
    directusToken: requireValue(source, 'API_TOKEN'),
    hookSecret: requireValue(source, 'PUBLICATION_HOOK_SECRET'),
  };
}

function readPort(source: EnvironmentSource): number {
  const raw = requireValue(source, 'API_PORT');
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`API_PORT must be an integer between 1 and 65535 (received "${raw}").`);
  }
  return parsed;
}

function requireValue(source: EnvironmentSource, name: string): string {
  const value = source[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`The environment variable ${name} is required.`);
  }
  return value;
}
