import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildChatPrompt } from './prompt-builder.ts';

describe('buildChatPrompt', () => {
  it('includes behaviour rules, facts and the visitor question', () => {
    const prompt = buildChatPrompt(
      {
        locale: 'en',
        conversationId: '00000000-0000-4000-8000-000000000099',
        messages: [{ role: 'visitor', text: 'What is your cloud experience?' }],
      },
      activePublicationFixture.content
    );

    expect(prompt).toContain('first person');
    expect(prompt).toContain('experience:');
    expect(prompt).toContain('What is your cloud experience?');
  });
});
