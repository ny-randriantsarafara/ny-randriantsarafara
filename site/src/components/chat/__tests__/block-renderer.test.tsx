import { contentFixture } from '@portfolio/content/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BlockRenderer } from '@/components/chat/block-renderer.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

describe('BlockRenderer', () => {
  it('skips unknown experience slugs silently', () => {
    render(
      <BlockRenderer
        blocks={[{ type: 'experience', slug: 'missing' }, { type: 'cv' }]}
        content={contentFixture}
        locale="en"
        dictionary={dictionaryFor('en')}
      />
    );
    expect(screen.getByRole('link', { name: /download cv/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /experience/i })).not.toBeInTheDocument();
  });
});
