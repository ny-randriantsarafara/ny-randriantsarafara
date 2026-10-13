import type { ActivePublication } from '@portfolio/content';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';

import type { ActivePublicationCache } from '../publications/active-publication-cache.ts';
import type { PublicationSource } from '../publications/publication-source.ts';
import { isAuthorizedHookCall } from './hook-authorization.ts';

const activationBodySchema = z.object({ publicationId: z.uuid() }).strict();

export type AppDependencies = {
  cache: ActivePublicationCache;
  source: PublicationSource;
  hookSecret: string;
  log: (message: string) => void;
};

export function createApp(dependencies: AppDependencies): Hono {
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

  app.post('/internal/publications/activated', async (context) => {
    if (!isAuthorizedHookCall(context.req.header('Authorization'), dependencies.hookSecret)) {
      return context.json({ error: 'unauthorized' }, 401);
    }
    const body = await readActivationBody(context);
    if (body === null) {
      return context.json({ error: 'invalid_request' }, 400);
    }
    try {
      const active = await dependencies.cache.reload();
      dependencies.log(
        `Publication ${body.publicationId} activated; serving ${active?.publicationId ?? 'none'}`
      );
      return context.body(null, 204);
    } catch (error) {
      dependencies.log(`Reload after activation failed: ${describeError(error)}`);
      return context.json({ error: 'unavailable' }, 503);
    }
  });

  app.notFound((context) => context.json({ error: 'not_found' }, 404));

  app.onError((error, context) => {
    dependencies.log(`Unexpected error: ${describeError(error)}`);
    return context.json({ error: 'internal_error' }, 500);
  });

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

async function readActivationBody(context: Context): Promise<{ publicationId: string } | null> {
  const body = await readJsonBody(context);
  const parsed = activationBodySchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

async function readJsonBody(context: Context): Promise<unknown> {
  try {
    const body: unknown = await context.req.json();
    return body;
  } catch {
    return null;
  }
}

async function readPublicationIdSafely(cache: ActivePublicationCache): Promise<string | null> {
  try {
    const active = await cache.current();
    return active?.publicationId ?? null;
  } catch {
    return null;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
