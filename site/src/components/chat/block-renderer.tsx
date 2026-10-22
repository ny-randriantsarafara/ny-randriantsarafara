'use client';

import { LayoutGroup } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

import { renderBlock } from '@/components/chat/blocks/render-block.tsx';
import { filterRenderableBlocks } from '@/lib/chat/block-resolver.ts';
import { readBlockTrackingKey } from '@/lib/tracking/block-key.ts';
import { impressionKey, markImpression } from '@/lib/tracking/impression-memory.ts';
import { observeVisibleImpression } from '@/lib/tracking/observe-visible-impression.ts';
import {
  readContentBlockType,
  readContentIdentifier,
  trackBlockView,
  trackContentImpression,
} from '@/lib/tracking/track-event.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

type BlockRendererProps = {
  blocks: readonly Block[];
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  conversationId: string;
  turnId: string;
  onOpenContact?: (topic: string | undefined) => void;
  layout?: 'stage' | 'inline';
  stageKey?: string;
};

function TrackedBlock({
  block,
  locale,
  conversationId,
  turnId,
  children,
}: {
  block: Block;
  locale: Locale;
  conversationId: string;
  turnId: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const legacyReportedRef = useRef(false);

  useEffect(() => {
    if (legacyReportedRef.current) {
      return;
    }
    legacyReportedRef.current = true;
    const key = readBlockTrackingKey(block);
    trackBlockView(locale, key.blockType, key.identifier, conversationId);
  }, [block, conversationId, locale]);

  useEffect(() => {
    const node = rootRef.current;
    if (node === null) {
      return;
    }
    const blockType = readContentBlockType(block);
    if (blockType === null) {
      return;
    }
    const identifier = readContentIdentifier(block);
    const key = impressionKey(turnId, blockType, identifier);
    return observeVisibleImpression(node, {
      onImpression: () => {
        if (!markImpression(key)) {
          return;
        }
        trackContentImpression(locale, blockType, identifier, conversationId);
      },
    });
  }, [block, conversationId, locale, turnId]);

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
  conversationId,
  turnId,
  onOpenContact,
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
          locale={locale}
          conversationId={conversationId}
          turnId={turnId}
        >
          {renderBlock(
            block,
            content,
            locale,
            dictionary,
            layout,
            index,
            onOpenContact,
            conversationId
          )}
        </TrackedBlock>
      ))}
    </div>
  );
  if (layout === 'stage' && stageKey !== undefined) {
    return <LayoutGroup id={stageKey}>{body}</LayoutGroup>;
  }
  return body;
}
