import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { createModelJsonSchema, modelJsonSchema } from './model-output-schema.ts';
import { validateAndNormalizeModelReply } from './model-reply.ts';

const reply = {
  outcome: 'answered',
  text: 'I build content APIs.',
  answerSlugs: [],
  suggestions: [],
  sensitiveTopicSlug: null,
};

describe('model output contract', () => {
  it('describes every block as a closed, fully specified strict-output object', () => {
    const schema = JSON.parse(JSON.stringify(modelJsonSchema));
    expect(schema.properties.blocks.items.anyOf).toHaveLength(8);
    for (const variant of schema.properties.blocks.items.anyOf) {
      expect(variant.additionalProperties).toBe(false);
      expect(variant.required.sort()).toEqual(Object.keys(variant.properties).sort());
    }
  });

  it('keeps nullable identifiers in separate typed union branches for provider compatibility', () => {
    const schema = createModelJsonSchema(activePublicationFixture.content);
    expect(schema.properties.sensitiveTopicSlug).toEqual({
      anyOf: [
        {
          type: 'string',
          enum: activePublicationFixture.content.chatSettings.sensitiveTopics.map(
            (topic) => topic.slug
          ),
        },
        { type: 'null' },
      ],
    });
  });

  it('does not offer cards for empty collections or create empty identifier enums', () => {
    const empty = {
      ...activePublicationFixture.content,
      answers: [],
      projects: [],
      keyFigures: [],
      chatSettings: { ...activePublicationFixture.content.chatSettings, sensitiveTopics: [] },
    };
    const schema = createModelJsonSchema(empty);
    expect(schema.properties.answerSlugs).toMatchObject({ maxItems: 0 });
    const types = schema.properties.blocks.items.anyOf.map(
      (variant) => variant.properties.type.enum[0]
    );
    expect(types).not.toContain('project');
    expect(types).not.toContain('strengths');
    expect(types).not.toContain('key-figures');
    expect(JSON.stringify(schema)).not.toContain('"enum":[]');
    expect(modelJsonSchema.properties.blocks.items.anyOf).toHaveLength(8);
  });

  it('normalizes nullable provider fields into public optional block fields', () => {
    const result = validateAndNormalizeModelReply(
      {
        ...reply,
        blocks: [
          { type: 'timeline', experienceSlugs: ['warner-bros-discovery'], skillSlug: null },
          { type: 'skills', capabilitySlug: null, highlightSlugs: ['typescript'] },
        ],
      },
      activePublicationFixture.content,
      'en'
    );
    expect(result).toMatchObject({
      status: 'ok',
      reply: {
        blocks: [
          { type: 'timeline', experienceSlugs: ['warner-bros-discovery'] },
          { type: 'skills', highlightSlugs: ['typescript'] },
        ],
        suggestions: [],
      },
    });
    if (result.status === 'ok') {
      expect(result.reply.blocks[0]).not.toHaveProperty('skillSlug');
      expect(result.reply.blocks[1]).not.toHaveProperty('capabilitySlug');
    }
  });

  it('allows concise replies without compulsory suggestions', () => {
    expect(
      validateAndNormalizeModelReply(
        { ...reply, blocks: [] },
        activePublicationFixture.content,
        'en'
      ).status
    ).toBe('ok');
  });

  it('still rejects unknown project identifiers after provider normalization', () => {
    expect(
      validateAndNormalizeModelReply(
        { ...reply, blocks: [{ type: 'project', slug: 'invented' }] },
        activePublicationFixture.content,
        'en'
      ).status
    ).toBe('unknown_identifier');
  });
});
