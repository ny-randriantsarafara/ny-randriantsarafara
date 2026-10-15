import { readFile } from 'node:fs/promises';

import { isDirectusError } from '@directus/sdk';

import { ensureAccess } from './access/ensure-access.ts';
import { ensurePublicationFlows } from './flows/ensure-publication-flows.ts';
import { createAdminClient } from './directus-client.ts';
import { readProvisionEnvironment } from './environment.ts';
import { portfolioCollections } from './schema/collections.ts';
import { ensureSchema } from './schema/ensure-schema.ts';
import { portfolioRelations } from './schema/relations.ts';
import { seedInitialContent } from './seed/seed-initial-content.ts';
import { ensureModelProfiles } from './settings/ensure-model-profiles.ts';
import { ensureSettings } from './settings/ensure-settings.ts';

function log(message: string): void {
  console.log(message);
}

async function provision(): Promise<void> {
  const environment = readProvisionEnvironment(process.env);
  const client = createAdminClient(environment.directusUrl, environment.adminToken);

  const assistantProtocol = await readFile(
    new URL('./assistant-protocol.md', import.meta.url),
    'utf8'
  );

  await ensureSchema(client, portfolioCollections, portfolioRelations, log);
  await ensureModelProfiles(client, log);
  await ensureAccess(client, environment, log);
  await ensurePublicationFlows(client, log);
  await ensureSettings(client, environment, assistantProtocol, log);
  if (environment.seedInitialContent) {
    await seedInitialContent(client, log);
  }
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
