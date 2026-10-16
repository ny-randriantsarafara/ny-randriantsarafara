import type { Context, MiddlewareHandler } from 'hono';

export function createCorsMiddleware(allowedOrigins: readonly string[]): MiddlewareHandler {
  const allowed = new Set(allowedOrigins);
  return async (context, next) => {
    const origin = context.req.header('Origin');
    const originAllowed = origin !== undefined && allowed.has(origin);
    if (context.req.method === 'OPTIONS') {
      if (!originAllowed) {
        return context.body(null, 405);
      }
      setCorsHeaders(context, origin);
      return context.body(null, 204);
    }
    await next();
    // Set after the handler: headers prepared before next() are lost when a route returns a raw Response.
    if (originAllowed) {
      setCorsHeaders(context, origin);
    }
  };
}

function setCorsHeaders(context: Context, origin: string): void {
  context.header('Access-Control-Allow-Origin', origin);
  context.header('Vary', 'Origin');
  context.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  context.header('Access-Control-Allow-Headers', 'Content-Type');
}
