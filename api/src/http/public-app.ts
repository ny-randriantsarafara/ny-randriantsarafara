import type { ActivePublication } from '@portfolio/content';
import { Hono } from 'hono';
import type { Context } from 'hono';

import type { ActivePublicationCache } from '../publications/active-publication-cache.ts';
import type { PublicationSource } from '../publications/publication-source.ts';
import { answerUnknownRoutesWithJson, describeError, type Log } from './responses.ts';

export type PublicAppDependencies = {
  cache: ActivePublicationCache;
  source: PublicationSource;
  log: Log;
};

// Served on API_PORT, the only port routed publicly.
export function createPublicApp(dependencies: PublicAppDependencies): Hono {
  const app = new Hono();

  app.get('/content/active', async (context) => {
    try {
      const active = await dependencies.cache.current();
      if (active === null) {
        return context.json({ error: 'not_found' }, 404);
      }
      return respondWithActivePublication(context, active);
    } catch (error) {
      dependencies.log(`Active publication unavailable: ${describeError(error)}`);
      return context.json({ error: 'unavailable' }, 503);
    }
  });

  app.get('/health', async (context) => {
    const directusUp = await dependencies.source.ping();
    const publicationId = await readPublicationIdSafely(dependencies.cache);
    if (!directusUp) {
      return context.json({ status: 'degraded', directus: 'down', publicationId }, 503);
    }
    return context.json({ status: 'ok', directus: 'up', publicationId }, 200);
  });

  answerUnknownRoutesWithJson(app, dependencies.log);

  return app;
}

function respondWithActivePublication(context: Context, active: ActivePublication): Response {
  const etag = `"${active.publicationId}"`;
  const ifNoneMatch = context.req.header('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
  return context.json(active, 200, {
    ETag: etag,
    'Cache-Control': 'public, max-age=60',
  });
}

async function readPublicationIdSafely(cache: ActivePublicationCache): Promise<string | null> {
  try {
    const active = await cache.current();
    return active?.publicationId ?? null;
  } catch {
    return null;
  }
}
