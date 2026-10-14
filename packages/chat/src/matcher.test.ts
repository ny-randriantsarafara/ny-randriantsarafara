import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { createScriptedMatcher } from './matcher.ts';

describe('createScriptedMatcher', () => {
  const matcher = createScriptedMatcher(contentFixture);

  it('answers from sample question overlap', () => {
    const result = matcher.reply('Tell me about your background and career path', 'en');
    expect(result.reply.outcome).toBe('answered');
    expect(result.reply.answerSlugs).toEqual(['journey']);
    expect(result.locale).toBe('en');
  });

  it('detects French and returns French text', () => {
    const result = matcher.reply('Parle-moi de ton parcours professionnel', 'en');
    expect(result.locale).toBe('fr');
    expect(result.reply.text).toBe(contentFixture.answers[0]?.text.fr);
  });

  it('routes salary questions to sensitive with contact block', () => {
    const result = matcher.reply('What salary are you looking for?', 'en');
    expect(result.reply.outcome).toBe('sensitive');
    expect(result.reply.blocks).toEqual([{ type: 'contact' }]);
    expect(result.reply.answerSlugs).toEqual([]);
  });

  it('returns unknown when nothing matches', () => {
    const result = matcher.reply('What is the weather in Paris tomorrow?', 'en');
    expect(result.reply.outcome).toBe('unknown');
    expect(result.reply.text).toBe(contentFixture.chatSettings.unknownReply.en);
  });

  it('suggests other starter questions after a match', () => {
    const result = matcher.reply('Tell me about your background', 'en');
    expect(result.reply.suggestions.length).toBeGreaterThan(0);
    expect(result.reply.suggestions.length).toBeLessThanOrEqual(3);
  });
});
