import { z } from 'zod';

export const localeSchema = z.enum(['en', 'fr']);
export type Locale = z.infer<typeof localeSchema>;

export const textSchema = z.string().trim().min(1, 'Must not be empty');

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase slug (letters, digits, hyphens)');

export const localizedTextSchema = z.object({ en: textSchema, fr: textSchema });
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedListSchema = z.object({
  en: z.array(textSchema),
  fr: z.array(textSchema),
});
export type LocalizedList = z.infer<typeof localizedListSchema>;

const filledListSchema = z.array(textSchema).min(1, 'Must have at least one item');

export const filledLocalizedListSchema = z.object({ en: filledListSchema, fr: filledListSchema });
