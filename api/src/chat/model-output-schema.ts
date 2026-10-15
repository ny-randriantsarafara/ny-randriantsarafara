import type { Locale, PublicationContent } from '@portfolio/content';
import { z } from 'zod';
import { buildEvidenceSources, type EvidenceSource } from './evidence.ts';
export const modelOutcomeSchema = z.enum(['answered', 'unknown', 'sensitive', 'refused']);
export const modelReplySchema = z.strictObject({
  outcome: modelOutcomeSchema,
  text: z.string().trim().min(1),
  evidence: z.array(z.strictObject({ sourceId: z.string(), quote: z.string() })),
  suggestions: z.array(z.string().trim().min(1).max(200)).max(3),
  sensitiveTopicSlug: z.string().nullable(),
});
export type ModelReply = z.infer<typeof modelReplySchema>;
export function createModelJsonSchema(
  content?: PublicationContent,
  locale: Locale = 'en',
  evidenceSources?: ReadonlyMap<string, EvidenceSource>
) {
  const ids =
    evidenceSources === undefined
      ? content === undefined
        ? undefined
        : buildEvidenceSources(content, locale).map((source) => source.id)
      : [...evidenceSources.keys()];
  const topics = content?.chatSettings.sensitiveTopics.map((topic) => topic.slug);
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      outcome: { type: 'string', enum: ['answered', 'unknown', 'sensitive', 'refused'] },
      text: { type: 'string' },
      evidence: {
        type: 'array',
        ...(ids?.length === 0 ? { maxItems: 0 } : {}),
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sourceId: {
              type: 'string',
              ...(ids === undefined || ids.length === 0 ? {} : { enum: ids }),
            },
            quote: { type: 'string' },
          },
          required: ['sourceId', 'quote'],
        },
      },
      suggestions: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 2 },
      sensitiveTopicSlug:
        topics?.length === 0
          ? { type: 'null' }
          : {
              anyOf: [
                { type: 'string', ...(topics === undefined ? {} : { enum: topics }) },
                { type: 'null' },
              ],
            },
    },
    required: ['outcome', 'text', 'evidence', 'suggestions', 'sensitiveTopicSlug'],
  };
}
export const modelJsonSchema = createModelJsonSchema();
