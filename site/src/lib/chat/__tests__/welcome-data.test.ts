import { contentFixture, eurosportProject, visaProject } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';

describe('buildWelcomeData', () => {
  it('includes starter questions and disclosure text', () => {
    const welcome = buildWelcomeData(contentFixture, 'en', null);
    expect(welcome.starters.length).toBeGreaterThan(0);
    expect(welcome.disclosure).toContain('AI');
    expect(welcome.initials.length).toBeGreaterThan(0);
  });

  it('keeps the introduction paragraphs as written', () => {
    const content = {
      ...contentFixture,
      profile: {
        ...contentFixture.profile,
        introduction: {
          en: 'I build APIs. On AWS.\n\nAsk me a question.',
          fr: 'Je développe des API. Sur AWS.\n\nPosez-moi une question.',
        },
      },
    };
    const welcome = buildWelcomeData(content, 'fr', null);
    expect(welcome.introductionParagraphs).toEqual([
      'Je développe des API. Sur AWS.',
      'Posez-moi une question.',
    ]);
  });

  it('selects the first two professional case studies in the visitor’s language', () => {
    const caseStudy = { en: 'A production migration.', fr: 'Une migration en production.' };
    const content = {
      ...contentFixture,
      projects: [
        { ...visaProject, caseStudy },
        eurosportProject,
        { ...eurosportProject, slug: 'first-case', caseStudy },
        { ...eurosportProject, slug: 'second-case', caseStudy },
        { ...eurosportProject, slug: 'later-case', caseStudy },
      ],
    };

    const welcome = buildWelcomeData(content, 'fr', null);

    expect(welcome.featuredCases.map(({ slug }) => slug)).toEqual(['first-case', 'second-case']);
    expect(welcome.featuredCases[0]?.caseStudy).toBe(caseStudy.fr);
  });
});
