import { isDirectusError } from '@directus/sdk';

import { createAdminClient } from './directus-client.ts';
import { readProvisionEnvironment } from './environment.ts';
import { portfolioCollections } from './schema/collections.ts';
import { ensureSchema } from './schema/ensure-schema.ts';
import { portfolioRelations } from './schema/relations.ts';

function log(message: string): void {
  console.log(message);
}

async function provision(): Promise<void> {
  const environment = readProvisionEnvironment(process.env);
  const client = createAdminClient(environment.directusUrl, environment.adminToken);

  await ensureSchema(client, portfolioCollections, portfolioRelations, log);
  log('Provisioning complete.');
}

function describeFailure(error: unknown): string {
  if (isDirectusError(error)) {
    return error.errors.map((detail) => `${detail.extensions.code}: ${detail.message}`).join('\n');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

try {
  await provision();
} catch (error) {
  console.error(`Provisioning failed:\n${describeFailure(error)}`);
  process.exitCode = 1;
}
