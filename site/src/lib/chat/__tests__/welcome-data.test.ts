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

  it('keeps every paragraph, including Node.js and the invitation to ask a question', () => {
    const introduction =
      'Bonjour, moi c’est Ny.\n\nJe développe avec Node.js et AWS.\n\nPosez votre question.';
    const content = {
      ...contentFixture,
      profile: { ...contentFixture.profile, introduction: { en: introduction, fr: introduction } },
    };
    const welcome = buildWelcomeData(content, 'fr', null);
    expect(welcome.introductionLines.join('\n\n')).toBe(introduction);
  });
});
