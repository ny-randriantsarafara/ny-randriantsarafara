import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { validateAndNormalizeModelReply } from './model-reply.ts';

const content = activePublicationFixture.content;

describe('validateAndNormalizeModelReply', () => {
  it('replaces unknown outcomes with the configured reply and scripted suggestions', () => {
    const result = validateAndNormalizeModelReply(
      {
        outcome: 'unknown',
        text: 'Model text',
        answerSlugs: [],
        blocks: [],
        suggestions: ['Model one', 'Model two'],
        sensitiveTopicSlug: null,
      },
      content,
      'en'
    );

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.reply.text).toBe(content.chatSettings.unknownReply.en);
      expect(result.reply.suggestions).toEqual(['My background']);
    }
  });

  it('rejects unknown identifiers in answer slugs', () => {
    const result = validateAndNormalizeModelReply(
      {
        outcome: 'answered',
        text: 'Answer',
        answerSlugs: ['missing-slug'],
        blocks: [],
        suggestions: ['One', 'Two'],
        sensitiveTopicSlug: null,
      },
      content,
      'en'
    );

    expect(result.status).toBe('unknown_identifier');
  });

  it('rejects an invalid sensitive topic slug', () => {
    const result = validateAndNormalizeModelReply(
      {
        outcome: 'sensitive',
        text: 'Sensitive',
        answerSlugs: [],
        blocks: [],
        suggestions: ['One', 'Two'],
        sensitiveTopicSlug: 'missing-topic',
      },
      content,
      'en'
    );

    expect(result.status).toBe('unknown_identifier');
  });

  it('keeps only two distinct supporting cards and suggestions', () => {
    const result = validateAndNormalizeModelReply(
      {
        outcome: 'answered',
        text: 'I build content APIs.',
        answerSlugs: ['why-me', 'why-me'],
        blocks: [
          { type: 'experience', slug: 'warner-bros-discovery' },
          { type: 'experience', slug: 'warner-bros-discovery' },
          { type: 'project', slug: 'eurosport-api-platform' },
          { type: 'contact' },
        ],
        suggestions: ['Which stack?', 'Which stack?', 'Which projects?'],
        sensitiveTopicSlug: null,
      },
      content,
      'en'
    );
    expect(result).toMatchObject({
      status: 'ok',
      reply: {
        answerSlugs: ['why-me'],
        blocks: [
          { type: 'experience', slug: 'warner-bros-discovery' },
          { type: 'project', slug: 'eurosport-api-platform' },
        ],
        suggestions: ['Which stack?', 'Which projects?'],
      },
    });
  });

  it('rejects suggestions longer than two hundred characters', () => {
    const longSuggestion = 'x'.repeat(201);
    const result = validateAndNormalizeModelReply(
      {
        outcome: 'answered',
        text: 'Answer',
        answerSlugs: ['why-me'],
        blocks: [{ type: 'strengths', answerSlug: 'why-me' }],
        suggestions: [longSuggestion, 'Two'],
        sensitiveTopicSlug: null,
      },
      content,
      'en'
    );

    expect(result.status).toBe('invalid_output');
  });
});
