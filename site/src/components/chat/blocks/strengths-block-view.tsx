'use client';

import { BlockShell } from '@/components/chat/blocks/block-shell.tsx';
import { localized } from '@/components/chat/blocks/localized.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function StrengthsBlockView({
  block,
  content,
  locale,
  dictionary,
  layout,
  index,
}: {
  block: Extract<Block, { type: 'strengths' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const answer = content.answers.find((item) => item.slug === block.answerSlug);
  if (answer === undefined) {
    return null;
  }
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.strengths} layout={layout} index={index}>
      <h3 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
        {localized(answer.topic, locale)}
      </h3>
      <p className="mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {localized(answer.text, locale)}
      </p>
    </BlockShell>
  );
}
