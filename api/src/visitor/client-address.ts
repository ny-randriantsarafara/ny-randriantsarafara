import type { Context } from 'hono';

const FALLBACK_ADDRESS = '0.0.0.0';

export function readClientAddress(
  context: Context,
  fallbackAddress: string = FALLBACK_ADDRESS
): string {
  const forwarded = context.req.header('X-Forwarded-For');
  if (forwarded !== undefined && forwarded.trim().length > 0) {
    const parts = forwarded
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const last = parts.at(-1);
    if (last !== undefined) {
      return last;
    }
  }
  const remote = context.req.raw.headers.get('x-real-ip');
  if (remote !== null && remote.trim().length > 0) {
    return remote.trim();
  }
  return fallbackAddress;
}
