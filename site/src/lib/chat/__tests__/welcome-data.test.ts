import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';

describe('buildWelcomeData', () => {
  it('includes starter questions and disclosure text', () => {
    const welcome = buildWelcomeData(contentFixture, 'en');
    expect(welcome.starters.length).toBeGreaterThan(0);
    expect(welcome.disclosure).toContain('AI');
    expect(welcome.initials.length).toBeGreaterThan(0);
  });
});
