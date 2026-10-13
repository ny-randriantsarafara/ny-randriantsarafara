export function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`The variable ${name} is missing from .env.`);
  }
  return value;
}

export const testEnvironment = {
  directusUrl: requireEnvironment('DIRECTUS_URL'),
  adminToken: requireEnvironment('ADMIN_TOKEN'),
  ownerToken: requireEnvironment('OWNER_TOKEN'),
  assistantToken: requireEnvironment('AI_TOKEN'),
  apiToken: requireEnvironment('API_TOKEN'),
  ownerEnforceTfa: requireEnvironment('OWNER_ENFORCE_TFA') === 'true',
  assistantAppAccess: requireEnvironment('AI_APP_ACCESS') === 'true',
  hookUrl: requireEnvironment('PUBLICATION_HOOK_URL'),
  hookSecret: requireEnvironment('PUBLICATION_HOOK_SECRET'),
};
