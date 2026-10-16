import { contentFixture } from '@portfolio/content/testing';
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
});
