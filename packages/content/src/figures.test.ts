import { describe, expect, it } from 'vitest';

import {
  figureOwner,
  figureOwnerName,
  figuresInText,
  parseFigureValue,
  textMentionsFigure,
} from './figures.ts';
import {
  contentFixture,
  coverageFigure,
  itrasExperience,
  warnerExperience,
  yearsFigure,
} from './testing/fixture.ts';
import type { KeyFigure, PublicationContent } from './publication.ts';

describe('figuresInText', () => {
  it.each([
    ['82%', { amount: 82, unit: 'percent' }],
    ['82 %', { amount: 82, unit: 'percent' }],
    ['82 percent', { amount: 82, unit: 'percent' }],
    ['82 pour cent', { amount: 82, unit: 'percent' }],
    ['~2M', { amount: 2, unit: 'million' }],
    ['2 million', { amount: 2, unit: 'million' }],
    ['about two million users', { amount: 2, unit: 'million' }],
    ['environ 2 millions', { amount: 2, unit: 'million' }],
    ['deux millions', { amount: 2, unit: 'million' }],
    ['8+', { amount: 8, unit: 'count' }],
    ['three teams', { amount: 3, unit: 'count' }],
    ['1,5 million', { amount: 1.5, unit: 'million' }],
    ['120k requests', { amount: 120, unit: 'thousand' }],
    ['deux milliers', { amount: 2, unit: 'thousand' }],
  ])('reads %s', (text, expected) => {
    expect(figuresInText(text)).toEqual([expected]);
  });

  it('reads every figure of a range', () => {
    expect(figuresInText('from 5% to 65% (TypeScript: 20% → 55%)')).toEqual([
      { amount: 5, unit: 'percent' },
      { amount: 65, unit: 'percent' },
      { amount: 20, unit: 'percent' },
      { amount: 55, unit: 'percent' },
    ]);
  });

  it('ignores product names and articles', () => {
    expect(figuresInText('EC2, S3, k6, HTTP/2, OAuth2, one team, un projet, twofold')).toEqual([]);
  });

  it('does not confuse a percentage with a count of the same number', () => {
    const percent = parseFigureValue('82%');
    expect(percent).not.toBeNull();
    if (percent === null) {
      return;
    }
    expect(textMentionsFigure('82 services migrated', percent)).toBe(false);
    expect(textMentionsFigure('Drove code coverage 0% → 82%.', percent)).toBe(true);
  });
});

describe('figureOwner', () => {
  const unowned = (keyFigure: KeyFigure): KeyFigure => ({
    ...keyFigure,
    ownerExperienceSlug: null,
    ownerProjectSlug: null,
  });

  it('returns the declared owner', () => {
    expect(figureOwner(contentFixture, coverageFigure)).toEqual({
      kind: 'experience',
      slug: 'itras-group',
    });
  });

  it('derives the only experience whose texts contain the value', () => {
    expect(figureOwner(contentFixture, unowned(coverageFigure))).toEqual({
      kind: 'experience',
      slug: 'itras-group',
    });
  });

  it('leaves a profile-wide figure unattributed', () => {
    expect(figureOwner(contentFixture, yearsFigure)).toBeNull();
  });

  it('leaves a value found in two experiences unattributed', () => {
    const content: PublicationContent = {
      ...contentFixture,
      experiences: [
        {
          ...warnerExperience,
          highlights: { en: ['Reached 82% coverage.'], fr: ['82 % de couverture.'] },
        },
        itrasExperience,
      ],
    };
    expect(figureOwner(content, unowned(coverageFigure))).toBeNull();
  });

  it('keeps an experience as owner when its own project repeats the value', () => {
    const content: PublicationContent = {
      ...contentFixture,
      experiences: [
        {
          ...warnerExperience,
          highlights: { en: ['Served ~2M users.'], fr: ['2 millions d’utilisateurs.'] },
        },
        itrasExperience,
      ],
      projects: contentFixture.projects.map((project) =>
        project.slug === 'eurosport-api-platform'
          ? { ...project, summary: { en: 'About 2 million users.', fr: 'Environ 2 millions.' } }
          : project
      ),
    };
    const users: KeyFigure = {
      slug: 'daily-users',
      value: '~2M',
      label: { en: 'Daily users', fr: 'Utilisateurs quotidiens' },
      ownerExperienceSlug: null,
      ownerProjectSlug: null,
    };
    expect(figureOwner(content, users)).toEqual({
      kind: 'experience',
      slug: 'warner-bros-discovery',
    });
  });
});
