import { activePublicationFixture } from '@portfolio/content/testing';
import { expect, it } from 'vitest';
import { buildEvidenceSources, resolveEvidence } from './evidence.ts';
it('requires an exact NFC quote in the referenced current localized field', () => {
  const content = structuredClone(activePublicationFixture.content);
  content.profile.introduction.fr = 'Une compétence publiée.';
  const sources = new Map(buildEvidenceSources(content, 'fr').map((source) => [source.id, source]));
  expect(
    resolveEvidence([{ sourceId: 'profile/introduction/fr', quote: 'compe\u0301tence' }], sources)
      .status
  ).toBe('ok');
  for (const ref of [
    { sourceId: 'profile/name', quote: 'compétence' },
    { sourceId: 'profile/introduction/en', quote: 'compétence' },
    { sourceId: 'missing', quote: 'compétence' },
    { sourceId: 'profile/introduction/fr', quote: '' },
    { sourceId: 'profile/introduction/fr', quote: 'COMPÉTENCE' },
  ])
    expect(resolveEvidence([ref], sources).status).toBe('invalid_evidence');
});
it('deduplicates evidence sources and preserves entity facts and links', () => {
  const sources = buildEvidenceSources(activePublicationFixture.content, 'en');
  const source = sources.find((item) => item.id === 'experiences/warner-bros-discovery/summary/en');
  if (source === undefined) throw new Error('Expected summary');
  expect(source.block).toEqual({ type: 'experience', slug: 'warner-bros-discovery' });
  const ref = { sourceId: source.id, quote: source.text };
  expect(resolveEvidence([ref, ref], new Map(sources.map((item) => [item.id, item])))).toEqual({
    status: 'ok',
    sources: [source],
  });
  expect(sources.some((item) => item.field === 'startMonth')).toBe(true);
  expect(sources.some((item) => item.field === 'githubUrl')).toBe(true);
});

it('invalidates corrected and deleted facts even when slugs survive', () => {
  const content = structuredClone(activePublicationFixture.content);
  const experience = content.experiences[0];
  if (experience === undefined) throw new Error('Expected experience');
  const ref = {
    sourceId: `experiences/${experience.slug}/summary/en`,
    quote: experience.summary.en,
  };
  experience.summary.en = 'A corrected publication statement.';
  expect(
    resolveEvidence(
      [ref],
      new Map(buildEvidenceSources(content, 'en').map((source) => [source.id, source]))
    ).status
  ).toBe('invalid_evidence');
  content.experiences = [];
  expect(
    resolveEvidence(
      [ref],
      new Map(buildEvidenceSources(content, 'en').map((source) => [source.id, source]))
    ).status
  ).toBe('invalid_evidence');
});

it('keeps relationship evidence attached to its owning entity card', () => {
  const content = activePublicationFixture.content;
  const sources = buildEvidenceSources(content, 'en');
  const experience = content.experiences.find((item) => item.skillSlugs.length > 0);
  if (experience === undefined) throw new Error('Expected linked skill');
  const relation = sources.find(
    (source) => source.id === `experiences/${experience.slug}/skillSlugs/0`
  );
  expect(relation?.text).toBe(experience.skillSlugs[0]);
  expect(relation?.block).toEqual({ type: 'experience', slug: experience.slug });
  expect(
    sources
      .filter((source) => source.collection === 'profile')
      .every((source) => source.block === null)
  ).toBe(true);
  expect(
    sources.some(
      (source) =>
        source.id.includes('/sampleQuestions/') ||
        source.id.includes('/followUpQuestions/') ||
        source.id.includes('/blocks/')
    )
  ).toBe(false);
});
