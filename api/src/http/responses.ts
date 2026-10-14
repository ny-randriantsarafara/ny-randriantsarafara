import type { Hono } from 'hono';

export type Log = (message: string) => void;

export function answerUnknownRoutesWithJson(app: Hono, log: Log): void {
  app.notFound((context) => context.json({ error: 'not_found' }, 404));

  app.onError((error, context) => {
    log(`Unexpected error: ${describeError(error)}`);
    return context.json({ error: 'internal_error' }, 500);
  });
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
