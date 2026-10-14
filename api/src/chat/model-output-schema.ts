import { blockSchema } from '@portfolio/content';
import { z } from 'zod';

export const modelOutcomeSchema = z.enum(['answered', 'unknown', 'sensitive', 'refused']);

export const modelReplySchema = z.object({
  outcome: modelOutcomeSchema,
  text: z.string().trim().min(1),
  answerSlugs: z.array(z.string()),
  blocks: z.array(blockSchema),
  suggestions: z.array(z.string().trim().min(1).max(200)).min(2).max(3),
  sensitiveTopicSlug: z.string().nullable(),
});

export type ModelReply = z.infer<typeof modelReplySchema>;

export const modelJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    outcome: { type: 'string', enum: ['answered', 'unknown', 'sensitive', 'refused'] },
    text: { type: 'string' },
    answerSlugs: { type: 'array', items: { type: 'string' } },
    blocks: { type: 'array', items: { type: 'object' } },
    suggestions: {
      type: 'array',
      items: { type: 'string', maxLength: 200 },
      minItems: 2,
      maxItems: 3,
    },
    sensitiveTopicSlug: { type: ['string', 'null'] },
  },
  required: ['outcome', 'text', 'answerSlugs', 'blocks', 'suggestions', 'sensitiveTopicSlug'],
};
