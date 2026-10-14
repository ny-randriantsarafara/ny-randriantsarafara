import { describe, expect, it } from 'vitest';

import { eventPayload, eventRequestSchema } from './event-request.ts';

describe('eventRequestSchema', () => {
  it('accepts supported event shapes', () => {
    const parsed = eventRequestSchema.safeParse({
      type: 'block_view',
      path: '/',
      locale: 'en',
      blockType: 'project',
      identifier: 'visa-insight',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects paths outside the site root', () => {
    const parsed = eventRequestSchema.safeParse({
      type: 'page_view',
      path: 'https://evil.example/',
      locale: 'en',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('eventPayload', () => {
  it('maps typed payloads for block and contact events', () => {
    const block = eventRequestSchema.parse({
      type: 'block_view',
      path: '/',
      locale: 'en',
      blockType: 'timeline',
    });
    expect(eventPayload(block)).toEqual({ blockType: 'timeline' });

    const contact = eventRequestSchema.parse({
      type: 'contact_click',
      path: '/',
      locale: 'en',
      channel: 'form',
    });
    expect(eventPayload(contact)).toEqual({ channel: 'form' });
  });
});
