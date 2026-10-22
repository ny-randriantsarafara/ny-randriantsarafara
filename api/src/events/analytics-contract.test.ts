import { describe, expect, it } from 'vitest';
import { chatRequestSchema, chatResponseSchema } from '@portfolio/chat';
import { eventRequestSchema, eventPayload } from './event-request.ts';
import { contactRequestSchema } from '../contact/contact-request.ts';

const id = '00000000-0000-4000-8000-000000000011';
const common = {
  path: '/',
  locale: 'en',
  eventId: id,
  journeyId: id,
  requestId: id,
  conversationId: id,
  occurredAt: '2026-10-22T10:00:00.000Z',
};
describe('optional analytics contracts', () => {
  it('preserves validated correlation and rejects malformed UUIDs without breaking legacy chat', () => {
    const legacy = {
      locale: 'en',
      conversationId: id,
      messages: [{ role: 'visitor', text: 'Hello' }],
    };
    expect(chatRequestSchema.parse(legacy)).toEqual(legacy);
    expect(chatRequestSchema.parse({ ...legacy, requestId: id, journeyId: id })).toMatchObject({
      requestId: id,
      journeyId: id,
    });
    expect(chatRequestSchema.safeParse({ ...legacy, requestId: 'bad' }).success).toBe(false);
    expect(
      chatResponseSchema.parse({
        mode: 'scripted',
        publicationId: id,
        requestId: id,
        reply: { text: 'Hello', outcome: 'unknown', answerSlugs: [], blocks: [], suggestions: [] },
      })
    ).toMatchObject({ requestId: id });
    expect(
      contactRequestSchema.parse({
        name: 'A',
        email: 'a@example.com',
        message: 'Hello',
        website: '',
        elapsedMilliseconds: 4000,
        locale: 'en',
        requestId: id,
        journeyId: id,
        conversationId: id,
      })
    ).toMatchObject({ requestId: id, journeyId: id, conversationId: id });
  });
  it('retains legacy events and accepts bounded lifecycle and engagement payloads', () => {
    expect(eventRequestSchema.parse({ type: 'page_view', path: '/', locale: 'en' })).toEqual({
      type: 'page_view',
      path: '/',
      locale: 'en',
    });
    for (const event of [
      { type: 'chat_submitted' },
      { type: 'chat_rendered', durationMs: 120, mode: 'model' },
      { type: 'chat_failed', reason: 'network' },
      { type: 'chat_cancelled', reason: 'superseded' },
      { type: 'chat_local_fallback', text: 'Please retry', reason: 'timeout' },
      { type: 'content_impression', blockType: 'project', identifier: 'portfolio' },
      { type: 'content_click', blockType: 'project', identifier: 'portfolio' },
      { type: 'engagement', durationMs: 5000 },
      { type: 'cv_click' },
    ])
      expect(eventRequestSchema.parse({ ...common, ...event })).toMatchObject({
        eventId: id,
        journeyId: id,
        ...event,
      });
    expect(eventRequestSchema.safeParse({ ...common, type: 'contact_stored' }).success).toBe(false);
    expect(
      eventRequestSchema.safeParse({ ...common, type: 'chat_failed', reason: 'arbitrary secret' })
        .success
    ).toBe(false);
    expect(
      eventRequestSchema.safeParse({ ...common, type: 'engagement', durationMs: 86400001 }).success
    ).toBe(false);
    expect(
      eventRequestSchema.safeParse({
        ...common,
        type: 'chat_local_fallback',
        reason: 'timeout',
        text: 'a'.repeat(2001),
      }).success
    ).toBe(false);
  });
  it('redacts browser fallback text before creating a telemetry payload', () => {
    const event = eventRequestSchema.parse({
      ...common,
      type: 'chat_local_fallback',
      reason: 'timeout',
      text: 'Email jane@example.com password=smallsecret',
    });
    expect(eventPayload(event)).toEqual({
      reason: 'timeout',
      text: 'Email [email] password=[credential]',
    });
  });
});

it('redacts legacy freeform block metadata as well as new fallback text', () => {
  expect(
    eventPayload(
      eventRequestSchema.parse({
        type: 'block_view',
        path: '/',
        locale: 'en',
        blockType: 'jane@example.com',
        identifier: 'token=secret',
      })
    )
  ).toEqual({ blockType: '[email]', identifier: 'token=[credential]' });
});
