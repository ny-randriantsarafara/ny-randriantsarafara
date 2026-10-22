import { describe, expect, it } from 'vitest';

import { isChatReviewTag, parseRequiredChatReviewTags, readChatReviewTags } from './tags.ts';

describe('chat review tags', () => {
  it('accepts the five structured tags', () => {
    const tags = parseRequiredChatReviewTags([
      'unsupported_claim',
      'wrong_card',
      'incomplete',
      'irrelevant',
      'supported',
    ]);
    expect(tags).toHaveLength(5);
    expect(isChatReviewTag('supported')).toBe(true);
    expect(isChatReviewTag('helpful')).toBe(false);
  });

  it('rejects unknown tags on write', () => {
    expect(() => parseRequiredChatReviewTags(['supported', 'made_up'])).toThrow(
      'Unsupported review tag "made_up".'
    );
  });

  it('ignores unknown tags when reading stored JSON', () => {
    expect(readChatReviewTags(['supported', 42, 'wrong_card'])).toEqual([
      'supported',
      'wrong_card',
    ]);
  });
});
