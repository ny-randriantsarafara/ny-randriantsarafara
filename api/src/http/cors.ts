import type { MiddlewareHandler } from 'hono';

export function createCorsMiddleware(allowedOrigins: readonly string[]): MiddlewareHandler {
  const allowed = new Set(allowedOrigins);
  return async (context, next) => {
    const origin = context.req.header('Origin');
    const originAllowed = origin !== undefined && allowed.has(origin);
    if (originAllowed) {
      context.header('Access-Control-Allow-Origin', origin);
      context.header('Vary', 'Origin');
      context.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      context.header('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (context.req.method === 'OPTIONS') {
      if (!originAllowed) {
        return context.body(null, 405);
      }
      return context.body(null, 204);
    }
    await next();
  };
}
