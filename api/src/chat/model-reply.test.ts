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
    'en'
  );
  expect(result.status).toBe('ok');
  if (result.status === 'ok') {
    expect(result.reply.blocks).toHaveLength(2);
    expect(result.reply.answerSlugs).toEqual(content.answers.map((answer) => answer.slug));
    expect(result.reply.suggestions).toEqual(['Next?', 'More?']);
  }
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
