import { z } from 'zod';
import { redactQuestion } from '../chat/redact-question.ts';

const localeSchema = z.enum(['en', 'fr']);
const pathSchema = z
  .string()
  .max(300)
  .refine((value) => value.startsWith('/'), { message: 'path must start with /' });
const utmSchema = z.string().max(100).optional();

const commonFields = {
  eventId: z.uuid().optional(),
  journeyId: z.uuid().optional(),
  requestId: z.uuid().optional(),
  conversationId: z.uuid().optional(),
  occurredAt: z.iso.datetime().optional(),
  path: pathSchema,
  locale: localeSchema,
  referrer: z.string().max(253).optional(),
  utm_source: utmSchema,
  utm_medium: utmSchema,
  utm_campaign: utmSchema,
};

const pageViewSchema = z.object({
  type: z.literal('page_view'),
  ...commonFields,
});

const quickViewOpenSchema = z.object({
  type: z.literal('quick_view_open'),
  ...commonFields,
});

const blockViewSchema = z.object({
  type: z.literal('block_view'),
  ...commonFields,
  blockType: z.string().min(1).max(100),
  identifier: z.string().max(200).optional(),
});

const suggestionClickSchema = z.object({
  type: z.literal('suggestion_click'),
  ...commonFields,
});

const cvDownloadSchema = z.object({
  type: z.literal('cv_download'),
  ...commonFields,
});

const contactChannelSchema = z.enum(['email', 'linkedin', 'github', 'form']);

const contactClickSchema = z.object({
  type: z.literal('contact_click'),
  ...commonFields,
  channel: contactChannelSchema,
});

const contactSubmitSchema = z.object({
  type: z.literal('contact_submit'),
  ...commonFields,
});

const localeSwitchSchema = z.object({
  type: z.literal('locale_switch'),
  ...commonFields,
  to: localeSchema,
});

const durationMs = z.number().int().min(0).max(86_400_000);
const failureReason = z.enum(['network', 'timeout', 'http', 'invalid_response', 'unavailable']);
const contentFields = {
  blockType: z.enum([
    'timeline',
    'experience',
    'project',
    'skills',
    'key-figures',
    'strengths',
    'contact',
    'cv',
  ]),
  identifier: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .max(200)
    .optional(),
};

export const eventRequestSchema = z.discriminatedUnion('type', [
  pageViewSchema,
  quickViewOpenSchema,
  blockViewSchema,
  suggestionClickSchema,
  cvDownloadSchema,
  contactClickSchema,
  contactSubmitSchema,
  localeSwitchSchema,
  z.object({ type: z.literal('chat_submitted'), ...commonFields }),
  z.object({
    type: z.literal('chat_rendered'),
    ...commonFields,
    durationMs,
    mode: z.enum(['model', 'scripted', 'local']),
  }),
  z.object({ type: z.literal('chat_failed'), ...commonFields, reason: failureReason }),
  z.object({
    type: z.literal('chat_cancelled'),
    ...commonFields,
    reason: z.enum(['superseded', 'navigation', 'user']),
  }),
  z.object({
    type: z.literal('chat_local_fallback'),
    ...commonFields,
    reason: failureReason,
    text: z.string().min(1).max(2000),
    durationMs: durationMs.optional(),
  }),
  z.object({ type: z.literal('content_impression'), ...commonFields, ...contentFields }),
  z.object({ type: z.literal('content_click'), ...commonFields, ...contentFields }),
  z.object({ type: z.literal('engagement'), ...commonFields, durationMs }),
  z.object({ type: z.literal('cv_click'), ...commonFields }),
]);

export type EventRequest = z.infer<typeof eventRequestSchema>;

export function eventPayload(request: EventRequest): Record<string, string | number> | null {
  if (request.type === 'chat_local_fallback')
    return {
      reason: request.reason,
      text: redactQuestion(request.text),
      ...(request.durationMs === undefined ? {} : { durationMs: request.durationMs }),
    };
  if (request.type === 'chat_rendered')
    return { durationMs: request.durationMs, mode: request.mode };
  if (request.type === 'chat_failed' || request.type === 'chat_cancelled')
    return { reason: request.reason };
  if (request.type === 'engagement') return { durationMs: request.durationMs };
  if (
    request.type === 'block_view' ||
    request.type === 'content_impression' ||
    request.type === 'content_click'
  ) {
    const payload: Record<string, string> = { blockType: redactQuestion(request.blockType) };
    if (request.identifier !== undefined) {
      payload.identifier = redactQuestion(request.identifier);
    }
    return payload;
  }
  if (request.type === 'cv_download') {
    return { locale: request.locale };
  }
  if (request.type === 'contact_click') {
    return { channel: request.channel };
  }
  if (request.type === 'locale_switch') {
    return { to: request.to };
  }
  return null;
}
