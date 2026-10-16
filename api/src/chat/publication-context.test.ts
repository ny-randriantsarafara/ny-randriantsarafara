import { activePublicationFixture } from '@portfolio/content/testing';
import { expect, it } from 'vitest';
import { createPublicationContextCache } from './publication-context.ts';
it('reuses localized immutable projections while preserving publication identity and rollback', () => {
  const cache = createPublicationContextCache();
  const a = structuredClone(activePublicationFixture);
  const b = structuredClone(a);
  b.publicationId = '00000000-0000-4000-8000-000000000087';
  b.content.profile.introduction.en = 'New fact';
  const first = cache.get(a, 'en');
  expect(first.publicationId).toBe(a.publicationId);
  expect(first.locale).toBe('en');
  expect(cache.get(a, 'en')).toBe(first);
  expect(cache.get(b, 'en').instructions).toContain('New fact');
  expect(cache.get(a, 'en')).toBe(first);
  expect(cache.get(a, 'fr').instructions).not.toBe(first.instructions);
  const knowledge = JSON.parse(first.instructions.split('\n\nknowledge:\n')[1] ?? 'null');
  expect(knowledge.answers[0]).not.toHaveProperty('sampleQuestions');
  expect(knowledge.answers[0]).not.toHaveProperty('blocks');
  expect(knowledge.answers[0]).not.toHaveProperty('starter');
  expect(knowledge.answers[0].text).toBe(a.content.answers[0]?.text.en);
  expect(a).toEqual(activePublicationFixture);
});
it('evicts least recently used entries at four and never retains oversized contexts', () => {
  const cache = createPublicationContextCache();
  const first = cache.get(activePublicationFixture, 'en');
  for (let i = 0; i < 4; i++)
    cache.get({ ...activePublicationFixture, publicationId: String(i) }, 'en');
  expect(cache.get(activePublicationFixture, 'en')).not.toBe(first);
  const large = structuredClone(activePublicationFixture);
  large.publicationId = 'oversized';
  large.content.profile.introduction.en = 'x'.repeat(2 * 1024 * 1024);
  expect(cache.get(large, 'en')).not.toBe(cache.get(large, 'en'));
});

it('retains every field except the editorial controls in both locales', () => {
  function localized(value: unknown, locale: 'en' | 'fr'): unknown {
    if (Array.isArray(value)) return value.map((item) => localized(item, locale));
    if (typeof value !== 'object' || value === null) return value;
    if ('en' in value && 'fr' in value) return value[locale];
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localized(item, locale)])
    );
  }
  for (const locale of ['en', 'fr']) {
    if (locale !== 'en' && locale !== 'fr') throw new Error('Invalid locale');
    const content = structuredClone(activePublicationFixture.content);
    const expected = {
      ...content,
      answers: content.answers.map((answer) => ({
        slug: answer.slug,
        topic: answer.topic,
        text: answer.text,
        experienceSlugs: answer.experienceSlugs,
        projectSlugs: answer.projectSlugs,
        skillSlugs: answer.skillSlugs,
        keyFigureSlugs: answer.keyFigureSlugs,
      })),
      projects: content.projects.map(({ followUpQuestion, ...project }) => {
        void followUpQuestion;
        return project;
      }),
    };
    const context = createPublicationContextCache().get(
      { ...activePublicationFixture, content },
      locale
    );
    expect(JSON.parse(context.instructions.split('\n\nknowledge:\n')[1] ?? 'null')).toEqual(
      localized(expected, locale)
    );
  }
});

it('refreshes LRU recency and evicts by combined byte size', () => {
  const cache = createPublicationContextCache();
  const first = cache.get(activePublicationFixture, 'en');
  const secondActive = { ...activePublicationFixture, publicationId: 'second' };
  const second = cache.get(secondActive, 'en');
  cache.get({ ...activePublicationFixture, publicationId: 'third' }, 'en');
  cache.get({ ...activePublicationFixture, publicationId: 'fourth' }, 'en');
  expect(cache.get(activePublicationFixture, 'en')).toBe(first);
  cache.get({ ...activePublicationFixture, publicationId: 'fifth' }, 'en');
  expect(cache.get(secondActive, 'en')).not.toBe(second);
  const medium = structuredClone(activePublicationFixture);
  medium.publicationId = 'medium-a';
  medium.content.profile.introduction.en = 'x'.repeat(550_000);
  const compiled = cache.get(medium, 'en');
  cache.get({ ...medium, publicationId: 'medium-b' }, 'en');
  expect(cache.get(medium, 'en')).not.toBe(compiled);
});
