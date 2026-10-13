import { serve } from '@hono/node-server';

import { createApp } from './http/app.ts';
import { readApiEnvironment } from './environment.ts';
import type { ApiEnvironment } from './environment.ts';
import { createActivePublicationCache } from './publications/active-publication-cache.ts';
import { createDirectusPublicationSource } from './publications/directus-publication-source.ts';

function readEnvironmentOrExit(): ApiEnvironment {
  try {
    return readApiEnvironment(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function main(): void {
  const environment = readEnvironmentOrExit();
  const source = createDirectusPublicationSource(
    environment.directusUrl,
    environment.directusToken
  );
  const cache = createActivePublicationCache(source);
  const app = createApp({
    cache,
    source,
    hookSecret: environment.hookSecret,
    log: (message) => {
      console.log(message);
    },
  });
  const server = serve({ fetch: app.fetch, port: environment.port }, (info) => {
    console.log(`API listening on http://localhost:${info.port}`);
  });

  const shutdown = (): void => {
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
