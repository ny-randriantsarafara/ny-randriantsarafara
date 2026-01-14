import { describe, expect, it } from 'vitest';

import {
  extractHeroSection,
  extractSection,
  extractSections,
  isSectionType,
} from '@/lib/content/helpers';

import type { PageContent, ProofSection, Section } from '@/types';

const contentFixture: PageContent = {
  metadata: {
    title: 'Ny Hasinavalona - Senior Software Engineer',
    description: 'Senior Software Engineer crafting scalable cloud systems.',
    themeColor: '#0b0b0d',
  },
  sections: [
    {
      type: 'hero',
      id: 'hero',
      data: {
        tagline: 'AWS',
        headline: 'Headline',
        highlightedText: 'Highlight',
        subheadline: 'Subheadline',
        primaryCta: { label: 'Contact', href: '#contact' },
        secondaryCta: { label: 'Work', href: '#projects' },
        email: 'test@example.com',
        trustedBy: [],
        snapshot: {
          title: 'Snapshot',
          description: 'Description',
          availability: 'Available',
          stats: [],
          footer: 'Footer',
        },
      },
    },
    {
      type: 'proof',
      id: 'proof',
      data: {
        title: 'Proof',
        subtitle: 'Subtitle',
        metrics: [],
        practiceItems: [],
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
    expect(hero?.data.tagline).toBe('AWS');
  });

  it('extracts multiple sections by type', () => {
    const proofs = extractSections<ProofSection>(contentFixture, 'proof');
    expect(proofs).toHaveLength(1);
    expect(proofs[0]?.id).toBe('proof');
  });

  it('narrows section types with isSectionType', () => {
    const section = contentFixture.sections[0] as Section;
    if (isSectionType(section, 'hero')) {
      expect((section as Extract<Section, { type: 'hero' }>).data.headline).toBe('Headline');
    } else {
      throw new Error('Expected hero section');
    }
  });
});
