import { contentFixture, coverageFigure, yearsFigure } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { dictionaryFor } from '../../i18n/dictionary.ts';
import {
  buildPageSections,
  channelLabel,
  figureCaption,
  formatMonthPeriod,
  formatYearPeriod,
  featuredSkillNames,
  skillNames,
} from '../sections.ts';

import type { KeyFigure } from '@portfolio/content';

const englishPeriods = dictionaryFor('en').periods;
const frenchPeriods = dictionaryFor('fr').periods;

describe('formatMonthPeriod', () => {
  it('spells out English months', () => {
    expect(formatMonthPeriod('2023-03', '2024-03', 'en', englishPeriods)).toBe(
      'March 2023 to March 2024'
    );
  });

  it('capitalises only the start of a French period', () => {
    expect(formatMonthPeriod('2023-03', '2024-03', 'fr', frenchPeriods)).toBe(
      'Mars 2023 à mars 2024'
    );
  });

  it('says since when for a current experience', () => {
    expect(formatMonthPeriod('2024-03', null, 'en', englishPeriods)).toBe('Since March 2024');
    expect(formatMonthPeriod('2024-03', null, 'fr', frenchPeriods)).toBe('Depuis mars 2024');
  });

  it('keeps a year without inventing a month', () => {
    expect(formatMonthPeriod('2024', null, 'fr', frenchPeriods)).toBe('Depuis 2024');
    expect(formatMonthPeriod('2018', '2018', 'fr', frenchPeriods)).toBe('2018');
    expect(formatMonthPeriod('2018', '2019-02', 'en', englishPeriods)).toBe(
      '2018 to February 2019'
    );
  });
});

describe('formatYearPeriod', () => {
  it('formats open-ended years', () => {
    expect(formatYearPeriod(2024, null, 'en', englishPeriods)).toBe('Since 2024');
    expect(formatYearPeriod(2024, null, 'fr', frenchPeriods)).toBe('Depuis 2024');
  });

  it('formats a range of years', () => {
    expect(formatYearPeriod(2023, 2024, 'fr', frenchPeriods)).toBe('2023 à 2024');
  });

  it('returns a single year when start and end match', () => {
    expect(formatYearPeriod(2022, 2022, 'en', englishPeriods)).toBe('2022');
  });

  it('returns empty when both years are missing', () => {
    expect(formatYearPeriod(null, null, 'en', englishPeriods)).toBe('');
  });
});

describe('skillNames', () => {
  it('keeps slug order and skips unknown slugs', () => {
    expect(skillNames(['typescript', 'missing', 'aws'], contentFixture.skills)).toEqual([
      'TypeScript',
      'AWS',
    ]);
  });
});

describe('featuredSkillNames', () => {
  it('returns featured skills up to the limit', () => {
    expect(featuredSkillNames(contentFixture.skills, 2)).toEqual(['TypeScript', 'AWS']);
  });
});

describe('channelLabel', () => {
  it('strips www and trailing slashes', () => {
    expect(channelLabel('https://www.linkedin.com/in/example/')).toBe('linkedin.com/in/example');
  });
});

describe('figureCaption', () => {
  it('names the employer a figure belongs to', () => {
    expect(figureCaption(contentFixture, coverageFigure, 'fr')).toBe(
      'Couverture atteinte — ITRAS Group'
    );
  });

  it('keeps a profile-wide figure label as published', () => {
    expect(figureCaption(contentFixture, yearsFigure, 'en')).toBe('Years of experience');
  });

  it('does not repeat an owner the label already names', () => {
    const labelled: KeyFigure = {
      ...coverageFigure,
      label: { en: 'Test coverage — ITRAS Group', fr: 'Couverture de tests — ITRAS Group' },
    };
    expect(figureCaption(contentFixture, labelled, 'en')).toBe('Test coverage — ITRAS Group');
  });
});

describe('buildPageSections', () => {
  it('shows whose each hero figure is', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    expect(sections.hero.snapshot.stats).toEqual([
      { value: '8+', label: 'Years of experience' },
      { value: '82%', label: 'Coverage achieved — ITRAS Group' },
    ]);
  });

  it('builds a hero tagline from location and featured skills', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    expect(sections.hero.tagline).toContain('Paris, France');
    expect(sections.hero.primaryCta.href).toBe('#projects');
    expect(sections.projects.items.length).toBeGreaterThan(0);
    expect(sections.initiatives.items.every((item) => item.tags.length >= 0)).toBe(true);
  });

  it('leaves out an empty location', () => {
    const content = {
      ...contentFixture,
      profile: { ...contentFixture.profile, location: { en: '', fr: '' } },
    };
    const sections = buildPageSections(content, 'fr', dictionaryFor('fr'));
    expect(sections.hero.tagline.startsWith(' · ')).toBe(false);
    expect(sections.contact.details.map((detail) => detail.label)).not.toContain('Localisation');
  });
});
