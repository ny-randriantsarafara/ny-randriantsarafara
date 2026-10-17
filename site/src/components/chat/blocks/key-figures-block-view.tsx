'use client';

import { BlockShell } from '@/components/chat/blocks/block-shell.tsx';
import { figureCaption } from '@/lib/publication/sections.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function KeyFiguresBlockView({
  block,
  content,
  locale,
  dictionary,
  layout,
  index,
}: {
  block: Extract<Block, { type: 'key-figures' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const figures = content.keyFigures.filter((figure) => block.slugs.includes(figure.slug));
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.keyFigures} layout={layout} index={index}>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-4">
        {figures.map((figure) => (
          <div key={figure.slug}>
            <dt className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {figure.value}
            </dt>
            <dd className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {figureCaption(content, figure, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </BlockShell>
  );
}
