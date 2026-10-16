import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { createCorsMiddleware } from './cors.ts';

describe('createCorsMiddleware', () => {
  const app = new Hono();
  app.use('*', createCorsMiddleware(['https://example.com']));
  app.post('/chat', (context) => context.json({ ok: true }));
  app.post(
    '/raw',
    () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  );

  it('reflects an allowed origin on a handler that returns a raw Response', async () => {
    const response = await app.request('http://localhost/raw', {
      method: 'POST',
      headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    expect(response.headers.get('Vary')).toBe('Origin');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('reflects an allowed origin on POST', async () => {
    const response = await app.request('http://localhost/chat', {
      method: 'POST',
      headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('answers preflight for an allowed origin', async () => {
    const response = await app.request('http://localhost/chat', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
  });

  it('omits CORS headers for an unknown origin', async () => {
    const response = await app.request('http://localhost/chat', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
