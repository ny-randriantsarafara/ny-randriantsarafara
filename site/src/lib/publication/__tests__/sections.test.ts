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
  textParagraphs,
} from '../sections.ts';

import type { KeyFigure, Skill } from '@portfolio/content';

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

const frenchNamedSkills: Skill[] = contentFixture.skills.map((skill) => {
  if (skill.slug !== 'aws') {
    return skill;
  }
  return { ...skill, frenchName: 'Services AWS' };
});

describe('skillNames', () => {
  it('keeps slug order and skips unknown slugs', () => {
    expect(skillNames(['typescript', 'missing', 'aws'], contentFixture.skills, 'en')).toEqual([
      'TypeScript',
      'AWS',
    ]);
  });

  it('uses the French name of a skill on the French page', () => {
    expect(skillNames(['typescript', 'aws'], frenchNamedSkills, 'fr')).toEqual([
      'TypeScript',
      'Services AWS',
    ]);
    expect(skillNames(['aws'], frenchNamedSkills, 'en')).toEqual(['AWS']);
  });
});

describe('featuredSkillNames', () => {
  it('returns featured skills up to the limit', () => {
    expect(featuredSkillNames(contentFixture.skills, 2, 'en')).toEqual(['TypeScript', 'AWS']);
  });
});

describe('textParagraphs', () => {
  it('splits a text on blank lines and drops empty paragraphs', () => {
    expect(textParagraphs('First.\n\n  Second.\n\n\n')).toEqual(['First.', 'Second.']);
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
      label: { en: 'Test coverage at ITRAS Group', fr: 'Couverture de tests chez ITRAS Group' },
    };
    expect(figureCaption(contentFixture, labelled, 'en')).toBe('Test coverage at ITRAS Group');
  });
});

describe('buildPageSections', () => {
  it('shows the overview paragraphs and the short facts in the hero', () => {
    const sections = buildPageSections(contentFixture, 'fr', dictionaryFor('fr'));
    expect(sections.hero.paragraphs).toEqual([
      'Je développe des API avec Node.js.',
      'Posez une question pour en savoir plus.',
    ]);
    expect(sections.hero.facts).toEqual([
      { label: 'Métier', value: 'Ingénieur backend et cloud senior' },
      { label: 'Expérience', value: 'Développement logiciel depuis 2018' },
      { label: 'Compétences principales', value: 'Node.js, TypeScript et AWS' },
      { label: 'Prise de contact', value: 'Disponible' },
    ]);
    expect(sections.hero.primaryCta.href).toBe('#projects');
  });

  it('falls back to the introduction and the featured skills for an older publication', () => {
    const content = {
      ...contentFixture,
      profile: {
        ...contentFixture.profile,
        overview: null,
        journey: null,
        experienceSummary: null,
        coreSkills: null,
      },
    };
    const sections = buildPageSections(content, 'en', dictionaryFor('en'));
    expect(sections.hero.paragraphs).toEqual(['I build reliable systems.']);
    expect(sections.about.journeyParagraphs).toEqual(['I build reliable systems.']);
    expect(sections.hero.facts.map((fact) => fact.label)).toEqual([
      'Role',
      'Core skills',
      'Getting in touch',
    ]);
    expect(sections.hero.facts[1]?.value).toBe('TypeScript, AWS');
  });

  it('groups the technologies table by usage, in usage then skill order', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    expect(sections.about.journeyParagraphs).toEqual([
      'I started in 2018.',
      'Today I work at Eurosport.',
    ]);
    expect(sections.about.technologies).toEqual([
      { usage: 'Backend', technologies: ['TypeScript', 'Java'] },
      { usage: 'AWS services', technologies: ['AWS'] },
    ]);
  });

  it('gives each project its case study and follow-up question', () => {
    const sections = buildPageSections(contentFixture, 'fr', dictionaryFor('fr'));
    const [eurosport] = sections.projects.items;
    expect(sections.projects.introduction).toBe(dictionaryFor('fr').projects.introduction);
    expect(eurosport?.followUpQuestion).toBe('Pourquoi vous recruter ?');
    expect(eurosport?.caseStudy).toBeNull();
  });

  it('puts the experience summary before its highlights', () => {
    const sections = buildPageSections(contentFixture, 'en', dictionaryFor('en'));
    const [warner] = sections.experience.items;
    expect(warner?.summary).toBe('Eurosport content APIs.');
    expect(warner?.bullets).toEqual(['Migrated to Terraform.']);
    expect(warner?.tech).toEqual(['TypeScript', 'AWS']);
  });

  it('leaves out an empty location', () => {
    const content = {
      ...contentFixture,
      profile: { ...contentFixture.profile, location: { en: '', fr: '' } },
    };
    const sections = buildPageSections(content, 'fr', dictionaryFor('fr'));
    expect(sections.footer.location).toBe('');
  });
});
