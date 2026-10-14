import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { filterRenderableBlocks } from '@/lib/chat/block-resolver.ts';

describe('filterRenderableBlocks', () => {
  it('skips blocks that reference unknown slugs', () => {
    const blocks = filterRenderableBlocks(
      [{ type: 'experience', slug: 'missing-company' }, { type: 'cv' }],
      contentFixture
    );
    expect(blocks).toEqual([{ type: 'cv' }]);
  });

  it('keeps timeline blocks when experiences exist', () => {
    const blocks = filterRenderableBlocks([{ type: 'timeline' }], contentFixture);
    expect(blocks).toEqual([{ type: 'timeline' }]);
  });
});
