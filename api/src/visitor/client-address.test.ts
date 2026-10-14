import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { readClientAddress } from './client-address.ts';

describe('readClientAddress', () => {
  const app = new Hono();
  app.get('/probe', (context) => context.text(readClientAddress(context, 'fallback')));

  it('uses the last X-Forwarded-For hop', async () => {
    const response = await app.request('http://localhost/probe', {
      headers: { 'X-Forwarded-For': '203.0.113.1, 198.51.100.9' },
    });
    await expect(response.text()).resolves.toBe('198.51.100.9');
  });

  it('falls back when the forwarded header is missing', async () => {
    const response = await app.request('http://localhost/probe');
    await expect(response.text()).resolves.toBe('fallback');
  });
});
