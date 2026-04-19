import { describe, expect, it } from 'vitest';

import {
  extractExperienceSection,
  extractHeroSection,
  extractInitiativesSection,
  extractSection,
  extractSections,
  isSectionType,
} from '@/lib/content/helpers';

import type { ExperienceSection, PageContent } from '@/types';

const contentFixture: PageContent = {
  metadata: {
    title:
      'Ny Hasinavalona Randriantsarafara — Senior Backend & Cloud Engineer | Software Architect',
    description: 'Senior Backend & Cloud Engineer.',
    themeColor: '#f5f5f7',
  },
  sections: [
    {
      type: 'hero',
      id: 'hero',
      data: {
        tagline: 'Pontault-Combault, France',
        availabilityBadge: 'EU Blue Card',
        headlinePrefix: 'Crafting cloud systems',
        headlineHighlight: 'built to last',
        headlineSuffix: 'not to impress.',
        subheadline: 'Subheadline',
        primaryCta: { label: 'Explore work', href: '#projects' },
        secondaryCta: { label: 'Resume', href: '/documents/resume.pdf' },
        email: 'test@example.com',
        snapshot: {
          role: 'Senior Backend & Cloud Engineer',
          location: 'Pontault-Combault, FR',
          stats: [{ value: '8+', label: 'Years experience' }],
          stack: ['TypeScript'],
        },
      },
    },
    {
      type: 'experience',
      id: 'experience',
      data: {
        eyebrow: 'Career path',
        headlinePrefix: 'Professional',
        headlineHighlight: 'experience',
        description: 'Description',
        items: [
          {
            company: 'WBD',
            role: 'Software Engineer',
            period: 'Mar 2024 — Present',
            location: 'Issy-les-Moulineaux, FR',
            bullets: ['Migrated to Terraform'],
            tech: ['TypeScript', 'AWS'],
          },
        ],
        earlierLine: 'Earlier roles',
      },
    },
    {
      type: 'initiatives',
      id: 'initiatives',
      data: {
        eyebrow: 'R&D',
        headlinePrefix: 'Side',
        headlineHighlight: 'investments',
        description: 'Description',
        items: [
          {
            icon: 'brain-circuit',
            title: 'Visa Insight',
            subtitle: 'NLP',
            description: 'Description',
            tags: ['NLP'],
          },
        ],
      },
    },
  ],
};

describe('content helpers', () => {
  it('extracts a section by type', () => {
    const hero = extractSection(contentFixture, 'hero');
    expect(hero?.id).toBe('hero');
  });

  it('extracts the hero section with the dedicated helper', () => {
    const hero = extractHeroSection(contentFixture);
    expect(hero?.data.tagline).toBe('Pontault-Combault, France');
  });

  it('extracts the experience section with the dedicated helper', () => {
    const experience = extractExperienceSection(contentFixture);
    expect(experience?.data.items).toHaveLength(1);
    expect(experience?.data.items[0]?.company).toBe('WBD');
  });

  it('extracts the initiatives section with the dedicated helper', () => {
    const initiatives = extractInitiativesSection(contentFixture);
    expect(initiatives?.data.items[0]?.icon).toBe('brain-circuit');
  });

  it('extracts multiple sections by type', () => {
    const experiences = extractSections<ExperienceSection>(contentFixture, 'experience');
    expect(experiences).toHaveLength(1);
  });

  it('narrows section types with isSectionType', () => {
    const [section] = contentFixture.sections;
    if (!section) {
      throw new Error('Fixture is missing the hero section');
    }
    if (isSectionType(section, 'hero')) {
      expect(section.data.headlinePrefix).toBe('Crafting cloud systems');
      return;
    }
    throw new Error('Expected hero section');
  });
});
