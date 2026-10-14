import { z } from 'zod';

const localeSchema = z.enum(['en', 'fr']);
const pathSchema = z
  .string()
  .max(300)
  .refine((value) => value.startsWith('/'), { message: 'path must start with /' });
const utmSchema = z.string().max(100).optional();

const commonFields = {
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

export const eventRequestSchema = z.discriminatedUnion('type', [
  pageViewSchema,
  quickViewOpenSchema,
  blockViewSchema,
  suggestionClickSchema,
  cvDownloadSchema,
  contactClickSchema,
  contactSubmitSchema,
  localeSwitchSchema,
]);

export type EventRequest = z.infer<typeof eventRequestSchema>;

export function eventPayload(request: EventRequest): Record<string, string> | null {
  if (request.type === 'block_view') {
    const payload: Record<string, string> = { blockType: request.blockType };
    if (request.identifier !== undefined) {
      payload.identifier = request.identifier;
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
