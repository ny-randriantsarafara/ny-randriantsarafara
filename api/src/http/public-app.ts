import type { ActivePublication } from '@portfolio/content';
import { Hono } from 'hono';
import type { Context } from 'hono';

import type { ChatService } from '../chat/chat-service.ts';
import type { ContactService } from '../contact/contact-service.ts';
import type { ActivePublicationCache } from '../publications/active-publication-cache.ts';
import type { PublicationSource } from '../publications/publication-source.ts';
import { readClientAddress } from '../visitor/client-address.ts';
import type { VisitorKeyFactory } from '../visitor/visitor-key.ts';
import { answerUnknownRoutesWithJson, describeError, type Log } from './responses.ts';
import { createCorsMiddleware } from './cors.ts';

export type PublicAppDependencies = {
  cache: ActivePublicationCache;
  source: PublicationSource;
  log: Log;
  corsAllowedOrigins: string[];
  chatService: ChatService;
  contactService: ContactService;
  visitorKeys: VisitorKeyFactory;
};

// Served on API_PORT, the only port routed publicly.
export function createPublicApp(dependencies: PublicAppDependencies): Hono {
  const app = new Hono();

  app.use('*', createCorsMiddleware(dependencies.corsAllowedOrigins));

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

  app.post('/chat', async (context) => {
    const body = await readJsonBody(context);
    const visitorKey = deriveVisitorKey(context, dependencies.visitorKeys);
    const result = await dependencies.chatService.handle(body, visitorKey);
    return jsonResponse(result.body, result.status);
  });

  app.post('/contact', async (context) => {
    const body = await readJsonBody(context);
    const visitorKey = deriveVisitorKey(context, dependencies.visitorKeys);
    const result = await dependencies.contactService.handle(body, visitorKey);
    return jsonResponse(result.body, result.status);
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

function deriveVisitorKey(context: Context, visitorKeys: VisitorKeyFactory): string {
  const userAgent = context.req.header('User-Agent') ?? '';
  return visitorKeys.derive(readClientAddress(context), userAgent);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readJsonBody(context: Context): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
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
