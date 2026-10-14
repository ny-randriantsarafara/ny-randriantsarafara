import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';

import type { ActivePublicationCache } from '../publications/active-publication-cache.ts';
import type { SiteBuildDispatcher } from '../site-build/site-build-dispatcher.ts';
import { describeSiteBuildOutcome } from '../site-build/site-build-dispatcher.ts';
import { isAuthorizedHookCall } from './hook-authorization.ts';
import { answerUnknownRoutesWithJson, describeError, type Log } from './responses.ts';

const activationBodySchema = z.object({ publicationId: z.uuid() }).strict();

export type InternalAppDependencies = {
  cache: ActivePublicationCache;
  hookSecret: string;
  siteBuild: SiteBuildDispatcher;
  log: Log;
};

// Served on API_INTERNAL_PORT, which is never routed: only the instance network reaches it.
export function createInternalApp(dependencies: InternalAppDependencies): Hono {
  const app = new Hono();

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
    } catch (error) {
      dependencies.log(`Reload after activation failed: ${describeError(error)}`);
      return context.json({ error: 'unavailable' }, 503);
    }
    // The chat already serves the new publication: a failed site build is logged, not returned.
    const outcome = await dependencies.siteBuild.dispatch();
    dependencies.log(describeSiteBuildOutcome(outcome));
    return context.body(null, 204);
  });

  answerUnknownRoutesWithJson(app, dependencies.log);

  return app;
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
