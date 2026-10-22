import { localeSchema } from '@portfolio/content';
import { z } from 'zod';

import { headerFieldHasNoNewlines } from './subject-line.ts';

const headerSafeString = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(headerFieldHasNoNewlines, 'Header fields must not contain line breaks.');

const optionalHeaderSafeString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(headerFieldHasNoNewlines, 'Header fields must not contain line breaks.')
    .optional();

export const contactRequestSchema = z.object({
  requestId: z.uuid().optional(),
  journeyId: z.uuid().optional(),
  conversationId: z.uuid().optional(),
  name: headerSafeString(100),
  email: z.email(),
  company: z.string().trim().max(100).optional(),
  message: z.string().trim().min(1).max(2000),
  locale: localeSchema,
  topic: optionalHeaderSafeString(200),
  website: z.string().max(0),
  elapsedMilliseconds: z.number().int().nonnegative(),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
