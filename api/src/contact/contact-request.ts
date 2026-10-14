import { localeSchema } from '@portfolio/content';
import { z } from 'zod';

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  company: z.string().trim().max(100).optional(),
  message: z.string().trim().min(1).max(2000),
  locale: localeSchema,
  topic: z.string().trim().max(200).optional(),
  website: z.string().max(0),
  elapsedMilliseconds: z.number().int().nonnegative(),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
