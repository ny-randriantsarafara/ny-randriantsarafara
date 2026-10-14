import { blockSchema, type PublicationContent } from '@portfolio/content';
import { z } from 'zod';

export const modelOutcomeSchema = z.enum(['answered', 'unknown', 'sensitive', 'refused']);

export const modelReplySchema = z.object({
  outcome: modelOutcomeSchema,
  text: z.string().trim().min(1),
  answerSlugs: z.array(z.string()),
  blocks: z.array(z.preprocess(omitNullOptionalFields, blockSchema)),
  suggestions: z.array(z.string().trim().min(1).max(200)).max(3),
  sensitiveTopicSlug: z.string().nullable(),
});

export type ModelReply = z.infer<typeof modelReplySchema>;

// Strict providers require every property, so optional block fields are nullable on the wire.
function omitNullOptionalFields(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) =>
        item !== null ||
        !['experienceSlugs', 'skillSlug', 'capabilitySlug', 'highlightSlugs', 'topic'].includes(key)
    )
  );
}

function identifierSchema(slugs?: string[], nullable = false) {
  if (nullable && slugs?.length === 0) return { type: 'null' };
  const identifier = { type: 'string', ...(slugs === undefined ? {} : { enum: slugs }) };
  return nullable ? { anyOf: [identifier, { type: 'null' }] } : identifier;
}

function identifierList(slugs?: string[]) {
  return {
    type: 'array',
    items: slugs?.length === 0 ? { type: 'string' } : identifierSchema(slugs),
    ...(slugs?.length === 0 ? { maxItems: 0 } : {}),
  };
}

function blockVariant(type: string, fields: Record<string, unknown> = {}) {
  const properties = { type: { type: 'string', enum: [type] }, ...fields };
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export function createModelJsonSchema(content?: PublicationContent) {
  const experiences = content?.experiences.map((item) => item.slug);
  const projects = content?.projects.map((item) => item.slug);
  const skills = content?.skills.map((item) => item.slug);
  const capabilities = content?.capabilities.map((item) => item.slug);
  const figures = content?.keyFigures.map((item) => item.slug);
  const answers = content?.answers.map((item) => item.slug);
  const nullableList = (slugs?: string[]) => ({ anyOf: [identifierList(slugs), { type: 'null' }] });
  const variants = [
    blockVariant('timeline', {
      experienceSlugs: nullableList(experiences),
      skillSlug: identifierSchema(skills, true),
    }),
    blockVariant('experience', { slug: identifierSchema(experiences) }),
    blockVariant('project', { slug: identifierSchema(projects) }),
    blockVariant('skills', {
      capabilitySlug: identifierSchema(capabilities, true),
      highlightSlugs: nullableList(skills),
    }),
    blockVariant('key-figures', { slugs: { ...identifierList(figures), minItems: 1 } }),
    blockVariant('strengths', { answerSlug: identifierSchema(answers) }),
    blockVariant('contact', { topic: { type: ['string', 'null'] } }),
    blockVariant('cv'),
  ].filter((variant) => {
    const type = variant.properties.type.enum[0];
    return !(
      (type === 'experience' && experiences?.length === 0) ||
      (type === 'project' && projects?.length === 0) ||
      (type === 'key-figures' && figures?.length === 0) ||
      (type === 'strengths' && answers?.length === 0)
    );
  });
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      outcome: { type: 'string', enum: ['answered', 'unknown', 'sensitive', 'refused'] },
      text: { type: 'string' },
      answerSlugs: identifierList(answers),
      blocks: { type: 'array', maxItems: 2, items: { anyOf: variants } },
      suggestions: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 2 },
      sensitiveTopicSlug: identifierSchema(
        content?.chatSettings.sensitiveTopics.map((item) => item.slug),
        true
      ),
    },
    required: ['outcome', 'text', 'answerSlugs', 'blocks', 'suggestions', 'sensitiveTopicSlug'],
  };
}

export const modelJsonSchema = createModelJsonSchema();
