import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';

import { createInternalApp, createPublicApp } from './http/index.ts';
import type { Log } from './http/responses.ts';
import { readApiEnvironment } from './environment.ts';
import type { ApiEnvironment } from './environment.ts';
import { createActivePublicationCache } from './publications/active-publication-cache.ts';
import { createDirectusPublicationSource } from './publications/directus-publication-source.ts';
import { createSiteBuildDispatcher } from './site-build/site-build-dispatcher.ts';

// Below Docker's 10 s stop timeout: in-flight requests finish, then the process exits.
const SHUTDOWN_GRACE_MILLISECONDS = 8_000;

function readEnvironmentOrExit(): ApiEnvironment {
  try {
    return readApiEnvironment(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function log(message: string): void {
  console.log(message);
}

function main(): void {
  const environment = readEnvironmentOrExit();
  const source = createDirectusPublicationSource(
    environment.directusUrl,
    environment.directusToken
  );
  const cache = createActivePublicationCache(source);
  const siteBuild = createSiteBuildDispatcher(environment.siteBuild, fetch);
  const publicApp = createPublicApp({ cache, source, log });
  const internalApp = createInternalApp({
    cache,
    hookSecret: environment.hookSecret,
    siteBuild,
    log,
  });
  const servers = [
    serve({ fetch: publicApp.fetch, port: environment.port }, (info) => {
      log(`API listening on http://localhost:${info.port}`);
    }),
    serve({ fetch: internalApp.fetch, port: environment.internalPort }, (info) => {
      log(`Publication hook listening on http://localhost:${info.port}`);
    }),
  ];

  const shutdown = (): void => {
    void closeAndExit(servers, log);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

async function closeAndExit(servers: readonly ServerType[], logShutdown: Log): Promise<void> {
  const forcedExit = setTimeout(() => {
    logShutdown('Shutdown grace period elapsed: exiting with open connections.');
    process.exit(1);
  }, SHUTDOWN_GRACE_MILLISECONDS);
  forcedExit.unref();
  await Promise.all(servers.map(closeServer));
  process.exit(0);
}

function closeServer(server: ServerType): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

main();
