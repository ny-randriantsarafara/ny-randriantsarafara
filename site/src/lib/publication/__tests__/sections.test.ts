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

describe('formatMonthPeriod', () => {
  it('preserves year-only precision without adding a month', () => {
    expect(formatMonthPeriod('2024', null, 'fr', 'aujourd’hui')).toBe('Depuis 2024');
    expect(formatMonthPeriod('2018', '2018', 'fr', 'aujourd’hui')).toBe('2018');
  });
  it('formats English months with a present end', () => {
    expect(formatMonthPeriod('2024-03', null, 'en', 'Present')).toBe('Mar 2024 to Present');
  });

  it('formats French months with a present end', () => {
    expect(formatMonthPeriod('2024-03', null, 'fr', 'aujourd’hui')).toBe('mars 2024 à aujourd’hui');
  });
});

describe('formatYearPeriod', () => {
  it('formats open-ended years', () => {
    expect(formatYearPeriod(2024, null, 'Present')).toBe('2024 · Present');
  });

  it('returns a single year when start and end match', () => {
    expect(formatYearPeriod(2022, 2022, 'Present')).toBe('2022');
  });

  it('returns empty when both years are missing', () => {
    expect(formatYearPeriod(null, null, 'Present')).toBe('');
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
      'Couverture atteinte · ITRAS Group'
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
  it('omits empty profile location details and separators', () => {
    const content = {
      ...contentFixture,
      profile: { ...contentFixture.profile, location: { en: '', fr: '' } },
    };
    const sections = buildPageSections(content, 'fr', dictionaryFor('fr'));
    expect(sections.contact.details.some((item) => item.label === 'Localisation')).toBe(false);
    expect(sections.hero.tagline.startsWith(' · ')).toBe(false);
  });
  it('shows whose each hero figure is', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    expect(sections.hero.snapshot.stats).toEqual([
      { value: '8+', label: 'Years of experience' },
      { value: '82%', label: 'Coverage achieved · ITRAS Group' },
    ]);
  });

  it('builds a hero tagline from location and featured skills', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    expect(sections.hero.tagline).toContain('Paris, France');
    expect(sections.hero.primaryCta.href).toBe('#projects');
    expect(sections.projects.items.length).toBeGreaterThan(0);
    expect(sections.initiatives.items.every((item) => item.tags.length >= 0)).toBe(true);
  });
});
