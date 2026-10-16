import { declaredFigureOwner, figureOwner, validatePublicationContent } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import { initialContent } from './initial-content.ts';

describe('initial content', () => {
  it('is a valid publication in both languages', () => {
    expect(validatePublicationContent(initialContent)).toEqual({
      valid: true,
      content: initialContent,
    });
  });

  it('keeps every experience of the current site', () => {
    expect(initialContent.experiences.map((experience) => experience.slug)).toEqual([
      'warner-bros-discovery',
      'euronews',
      'numer-hei',
      'novity',
      'bocasay',
      'itras-group',
      'allo-application',
    ]);
  });

  it('keeps the current case studies and side projects', () => {
    expect(initialContent.projects.map((project) => `${project.kind}:${project.slug}`)).toEqual([
      'professional:eurosport-api-platform',
      'professional:high-traffic-media-platform',
      'professional:saas-for-craftsmen',
      'personal:visa-insight',
      'personal:lalana-lemurion',
      'personal:cloud-platform-maestro',
    ]);
  });

  it('includes a draft answer bank with four starters', () => {
    expect(initialContent.answers.length).toBe(20);
    expect(
      initialContent.answers.filter((answer) => answer.starter).map((answer) => answer.slug)
    ).toEqual(['about-me', 'career-journey', 'flagship-results', 'why-hire']);
  });

  it('declares the key figure owners that the published texts imply', () => {
    const owners = initialContent.keyFigures.map((keyFigure) => [
      keyFigure.slug,
      figureOwner(initialContent, {
        ...keyFigure,
        ownerExperienceSlug: null,
        ownerProjectSlug: null,
      }),
      declaredFigureOwner(keyFigure),
    ]);
    expect(owners).toEqual([
      ['years-experience', null, null],
      [
        'daily-users',
        { kind: 'experience', slug: 'euronews' },
        { kind: 'experience', slug: 'euronews' },
      ],
      [
        'coverage-achieved',
        { kind: 'experience', slug: 'itras-group' },
        { kind: 'experience', slug: 'itras-group' },
      ],
    ]);
  });

  it('features the core stack of the current site', () => {
    expect(
      initialContent.skills.filter((skill) => skill.featured).map((skill) => skill.name)
    ).toEqual(['AWS', 'Terraform', 'TypeScript', 'Node.js', 'GraphQL', 'PostgreSQL']);
  });
});
