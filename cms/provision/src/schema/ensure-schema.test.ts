import { expect, it } from 'vitest';
import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { ensureSchema } from './ensure-schema.ts';
import { portfolioCollections } from './collections.ts';

it('updates existing telemetry field labels and nullable failure fields while preserving unrelated fields', async () => {
  const definitions = portfolioCollections.filter(
    (item) => item.collection === 'chat_exchanges' || item.collection === 'profile'
  );
  const writes: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (init?.method === 'PATCH') {
      writes.push({ url: path, body: JSON.parse(String(init.body)) });
      return Response.json({ data: {} });
    }
    if (path === '/collections')
      return Response.json({ data: definitions.map((item) => ({ collection: item.collection })) });
    if (path === '/relations') return Response.json({ data: [] });
    const definition = definitions.find((item) => path === `/fields/${item.collection}`);
    return Response.json({
      data:
        definition?.fields.map((field) => ({
          ...field,
          meta: {
            custom: 'preserve',
            translations: [{ language: 'en-US', translation: field.field }],
          },
        })) ?? [],
    });
  };
  const client = createDirectus<PortfolioSchema>('https://cms.example', {
    globals: { fetch: fetchImpl },
  })
    .with(staticToken('test'))
    .with(rest());
  await ensureSchema(client, definitions, [], () => {});
  expect(writes.some((write) => write.url === '/fields/chat_exchanges/cache_read_tokens')).toBe(
    true
  );
  expect(writes.find((write) => write.url === '/fields/chat_exchanges/mode')?.body).toMatchObject({
    schema: { is_nullable: true },
    meta: { required: false },
  });
  expect(writes.some((write) => write.url.startsWith('/fields/profile/'))).toBe(false);
  expect(writes.some((write) => write.url === '/fields/chat_exchanges/question')).toBe(false);
});
