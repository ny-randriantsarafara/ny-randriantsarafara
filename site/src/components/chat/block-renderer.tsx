'use client';

import { LayoutGroup } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

import { renderBlock } from '@/components/chat/blocks/render-block.tsx';
import { filterRenderableBlocks } from '@/lib/chat/block-resolver.ts';
import { readBlockTrackingKey } from '@/lib/tracking/block-key.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

type BlockRendererProps = {
  blocks: readonly Block[];
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  onOpenContact?: (topic: string | undefined) => void;
  onBlockView?: (block: Block) => void;
  layout?: 'stage' | 'inline';
  stageKey?: string;
};

function TrackedBlock({
  block,
  onBlockView,
  children,
}: {
  block: Block;
  onBlockView?: (block: Block) => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (onBlockView === undefined) {
      return;
    }
    const node = rootRef.current;
    if (node === null) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (reportedRef.current) {
          return;
        }
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) {
          return;
        }
        reportedRef.current = true;
        onBlockView(block);
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [block, onBlockView]);

  return (
    <div ref={rootRef} className="min-w-0">
      {children}
    </div>
  );
}

export function BlockRenderer({
  blocks,
  content,
  locale,
  dictionary,
  onOpenContact,
  onBlockView,
  layout = 'stage',
  stageKey,
}: BlockRendererProps) {
  const renderable = filterRenderableBlocks(blocks, content);
  const body = (
    <div
      className={
        layout === 'stage' && renderable.length > 1
          ? 'grid w-full grid-cols-1 items-start gap-4 @5xl:grid-cols-2'
          : 'flex w-full flex-col gap-4'
      }
    >
      {renderable.map((block, index) => (
        <TrackedBlock
          key={`${readBlockTrackingKey(block).blockType}-${index}`}
          block={block}
          onBlockView={onBlockView}
        >
          {renderBlock(block, content, locale, dictionary, layout, index, onOpenContact)}
        </TrackedBlock>
      ))}
    </div>
  );
  if (layout === 'stage' && stageKey !== undefined) {
    return <LayoutGroup id={stageKey}>{body}</LayoutGroup>;
  }
  return body;
}
