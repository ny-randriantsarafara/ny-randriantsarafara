'use client';

import { LayoutGroup } from 'motion/react';

import { renderBlock } from '@/components/chat/blocks/render-block.tsx';
import { filterRenderableBlocks } from '@/lib/chat/block-resolver.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

type BlockRendererProps = {
  blocks: readonly Block[];
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  onOpenContact?: (topic: string | undefined) => void;
  layout?: 'stage' | 'inline';
  stageKey?: string;
};

export function BlockRenderer({
  blocks,
  content,
  locale,
  dictionary,
  onOpenContact,
  layout = 'stage',
  stageKey,
}: BlockRendererProps) {
  const renderable = filterRenderableBlocks(blocks, content);
  const body = (
    <div className="flex w-full flex-col gap-4">
      {renderable.map((block, index) =>
        renderBlock(block, content, locale, dictionary, layout, index, onOpenContact)
      )}
    </div>
  );
  if (layout === 'stage' && stageKey !== undefined) {
    return <LayoutGroup id={stageKey}>{body}</LayoutGroup>;
  }
  return body;
}
