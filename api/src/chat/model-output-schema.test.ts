import { activePublicationFixture } from '@portfolio/content/testing';
import { expect, it } from 'vitest';
import { createModelJsonSchema, modelReplySchema } from './model-output-schema.ts';
it('offers only closed evidence references bound to localized current sources', () => {
  const schema = createModelJsonSchema(activePublicationFixture.content, 'fr');
  expect(schema.properties).not.toHaveProperty('blocks');
  expect(schema.properties).not.toHaveProperty('answerSlugs');
  expect(schema.properties.evidence.items.additionalProperties).toBe(false);
  expect(schema.properties.evidence.items.properties.sourceId.enum).toContain(
    'profile/introduction/fr'
  );
  expect(schema.properties.evidence.items.properties.sourceId.enum).not.toContain(
    'profile/introduction/en'
  );
  expect(JSON.stringify(schema)).not.toContain('"enum":[]');
});
it('rejects model supplied cards', () => {
  expect(
    modelReplySchema.safeParse({
      outcome: 'answered',
      text: 'x',
      evidence: [],
      blocks: [{ type: 'cv' }],
      suggestions: [],
      sensitiveTopicSlug: null,
    }).success
  ).toBe(false);
});
it('offers the provider the same outcomes the server accepts', () => {
  const schema = createModelJsonSchema(activePublicationFixture.content, 'en');
  expect(schema.properties.outcome.enum).toContain('clarification_required');
  expect(
    modelReplySchema.safeParse({
      outcome: 'clarification_required',
      text: 'Which employer do you mean?',
      evidence: [],
      suggestions: [],
      sensitiveTopicSlug: null,
    }).success
  ).toBe(true);
});
