import { z } from 'zod';

import { slugSchema, textSchema } from './localized.ts';

export const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('timeline'),
    experienceSlugs: z.array(slugSchema).optional(),
    skillSlug: slugSchema.optional(),
  }),
  z.object({ type: z.literal('experience'), slug: slugSchema }),
  z.object({ type: z.literal('project'), slug: slugSchema }),
  z.object({
    type: z.literal('skills'),
    capabilitySlug: slugSchema.optional(),
    highlightSlugs: z.array(slugSchema).optional(),
  }),
  z.object({ type: z.literal('key-figures'), slugs: z.array(slugSchema).min(1) }),
  z.object({ type: z.literal('strengths'), answerSlug: slugSchema }),
  z.object({ type: z.literal('contact'), topic: textSchema.optional() }),
  z.object({ type: z.literal('cv') }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block['type'];
