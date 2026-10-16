import { activePublicationFixture } from '@portfolio/content/testing';
import { expect, it } from 'vitest';
import { buildEvidenceSources } from './evidence.ts';
import { validateAndNormalizeModelReply } from './model-reply.ts';
const content = activePublicationFixture.content;
const base = {
  outcome: 'answered',
  text: 'Published facts.',
  evidence: [],
  suggestions: [],
  sensitiveTopicSlug: null,
};
it('requires evidence for answered and rejects stale or wrong-field evidence', () => {
  expect(validateAndNormalizeModelReply(base, content, 'en').status).toBe('invalid_evidence');
  expect(
    validateAndNormalizeModelReply(
      { ...base, evidence: [{ sourceId: 'missing', quote: 'fact' }] },
      content,
      'en'
    ).status
  ).toBe('invalid_evidence');
});
it('derives up to two deduplicated cards and prepared answer slugs from proofs', () => {
  const sources = buildEvidenceSources(content, 'en').filter(
    (source) => source.field === 'summary' || source.field === 'text'
  );
  const refs = sources.map((source) => ({ sourceId: source.id, quote: source.text }));
  const result = validateAndNormalizeModelReply(
    { ...base, evidence: [...refs, ...refs], suggestions: ['Next?', 'Next?', 'More?'] },
    content,
    'en',
    { askedQuestions: ['Why should we hire you?'] }
  );
  expect(result.status).toBe('ok');
  if (result.status === 'ok') {
    expect(result.reply.blocks).toHaveLength(2);
    expect(result.reply.answerSlugs).toEqual(content.answers.map((answer) => answer.slug));
    expect(result.reply.suggestions).toEqual(['Next?', 'More?']);
  }
});

it('suggests the follow-ups written for the cited answers before the model ones', () => {
  const result = validateAndNormalizeModelReply(
    {
      ...base,
      text: 'I started in Madagascar.',
      evidence: [evidenceFor('answers/journey/text/en')],
      suggestions: ['Why should we hire you?', 'What came next?', 'Anything else?'],
    },
    content,
    'en',
    { askedQuestions: ['Tell me about your background'] }
  );
  expect(result).toMatchObject({
    status: 'ok',
    reply: { suggestions: ['Why should we hire you?', 'What came next?'] },
  });
});

it('suggests the follow-ups written for the sample question asked, whatever the model cites', () => {
  const result = validateAndNormalizeModelReply(
    {
      ...base,
      text: 'Angular and Spring Boot.',
      evidence: [evidenceFor('experiences/itras-group/summary/en')],
      suggestions: ['What came next?'],
    },
    content,
    'en',
    {
      question: 'Tell me about your background',
      askedQuestions: ['Tell me about your background'],
    }
  );
  expect(result).toMatchObject({
    status: 'ok',
    reply: { answerSlugs: [], suggestions: ['Why should we hire you?', 'What came next?'] },
  });
});

it('does not suggest again a follow-up the visitor already asked', () => {
  const result = validateAndNormalizeModelReply(
    {
      ...base,
      text: 'I started in Madagascar.',
      evidence: [evidenceFor('answers/journey/text/en')],
      suggestions: ['What came next?'],
    },
    content,
    'en',
    { askedQuestions: ['why should we hire you ?', 'Tell me about your background'] }
  );
  expect(result).toMatchObject({ status: 'ok', reply: { suggestions: ['What came next?'] } });
});
it('normalizes nonfactual outcomes from CMS and rejects missing sensitive topics', () => {
  const result = validateAndNormalizeModelReply({ ...base, outcome: 'unknown' }, content, 'en');
  expect(result).toMatchObject({
    status: 'ok',
    reply: { text: content.chatSettings.unknownReply.en, blocks: [] },
  });
  expect(
    validateAndNormalizeModelReply(
      { ...base, outcome: 'sensitive', sensitiveTopicSlug: 'missing' },
      content,
      'en'
    ).status
  ).toBe('unknown_identifier');
});

it('rejects oversized suggestions and normalizes refusals and sensitive policy replies', () => {
  expect(
    validateAndNormalizeModelReply({ ...base, suggestions: ['x'.repeat(201)] }, content, 'en')
      .status
  ).toBe('invalid_output');
  expect(
    validateAndNormalizeModelReply({ ...base, outcome: 'refused' }, content, 'fr')
  ).toMatchObject({
    status: 'ok',
    reply: { outcome: 'refused', text: content.chatSettings.refusalReply.fr, blocks: [] },
  });
  const topic = content.chatSettings.sensitiveTopics[0];
  if (topic === undefined) throw new Error('Expected sensitive topic');
  expect(
    validateAndNormalizeModelReply(
      { ...base, outcome: 'sensitive', sensitiveTopicSlug: topic.slug },
      content,
      'fr'
    )
  ).toMatchObject({
    status: 'ok',
    reply: { outcome: 'sensitive', text: topic.reply.fr, blocks: [{ type: 'contact' }] },
  });
});

function evidenceFor(sourceId: string) {
  const source = buildEvidenceSources(content, 'en').find((candidate) => candidate.id === sourceId);
  if (source === undefined) throw new Error(`Missing source ${sourceId}`);
  return { sourceId, quote: source.text };
}

it('shows the cards a cited prepared answer was authored with, not a card of its own text', () => {
  const result = validateAndNormalizeModelReply(
    { ...base, text: 'I own outcomes.', evidence: [evidenceFor('answers/why-me/text/en')] },
    content,
    'en'
  );
  expect(result).toMatchObject({
    status: 'ok',
    reply: {
      answerSlugs: ['why-me'],
      blocks: [{ type: 'project', slug: 'eurosport-api-platform' }, { type: 'contact' }],
    },
  });
});

it('keeps the cards of the entities the question is about', () => {
  const result = validateAndNormalizeModelReply(
    {
      ...base,
      text: 'At ITRAS Group I worked with Angular and Spring Boot.',
      evidence: [
        evidenceFor('experiences/warner-bros-discovery/summary/en'),
        evidenceFor('experiences/itras-group/summary/en'),
      ],
    },
    content,
    'en',
    {
      questionFocus: {
        scope: { experienceSlugs: ['itras-group'], projectSlugs: [] },
        focusCard: { type: 'experience', slug: 'itras-group' },
      },
    }
  );
  expect(result).toMatchObject({
    status: 'ok',
    reply: { blocks: [{ type: 'experience', slug: 'itras-group' }] },
  });
});

it('keeps a clarification from the model as a question without cards', () => {
  expect(
    validateAndNormalizeModelReply(
      {
        ...base,
        outcome: 'clarification_required',
        text: 'Do you mean Warner Bros. Discovery or ITRAS Group?',
        suggestions: ['Tell me about ITRAS Group.'],
      },
      content,
      'en'
    )
  ).toEqual({
    status: 'ok',
    reply: {
      outcome: 'clarification_required',
      text: 'Do you mean Warner Bros. Discovery or ITRAS Group?',
      answerSlugs: [],
      blocks: [],
      suggestions: ['Tell me about ITRAS Group.'],
    },
  });
});

it('reports the claims the cited evidence does not support', () => {
  expect(
    validateAndNormalizeModelReply(
      {
        ...base,
        text: 'At Warner Bros. Discovery I led a team and raised coverage to 82%.',
        evidence: [
          evidenceFor('experiences/warner-bros-discovery/summary/en'),
          evidenceFor('experiences/itras-group/highlights/en/0'),
        ],
      },
      content,
      'en'
    )
  ).toEqual({
    status: 'unsupported_claims',
    problems: ['misattributed_figure', 'unsupported_responsibility'],
  });
});
