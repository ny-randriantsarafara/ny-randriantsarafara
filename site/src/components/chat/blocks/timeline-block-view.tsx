'use client';

import { m, useReducedMotion } from 'motion/react';

import { BlockShell, easeOut } from '@/components/chat/blocks/block-shell.tsx';
import { localized } from '@/components/chat/blocks/localized.ts';
import { formatMonthPeriod } from '@/lib/publication/sections.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function TimelineBlockView({
  block,
  content,
  locale,
  dictionary,
  layout,
  index,
}: {
  block: Extract<Block, { type: 'timeline' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const reduced = useReducedMotion();
  const experiences = content.experiences.filter((experience) => {
    if (block.experienceSlugs !== undefined) {
      return block.experienceSlugs.includes(experience.slug);
    }
    if (block.skillSlug !== undefined) {
      return experience.skillSlugs.includes(block.skillSlug);
    }
    return true;
  });

  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.timeline} layout={layout} index={index}>
      <ul className="flex flex-col gap-4">
        {experiences.map((experience) => {
          const focusOne =
            !reduced &&
            experiences.length === 1 &&
            (block.experienceSlugs?.length === 1 || block.skillSlug !== undefined);
          const itemClassName = focusOne
            ? 'flex flex-col gap-1 rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-4'
            : 'flex flex-col gap-1 border-l-2 border-indigo-400/40 pl-4';
          const ItemTag = reduced ? 'li' : m.li;
          return (
            <ItemTag
              key={experience.slug}
              className={itemClassName}
              {...(focusOne
                ? {
                    layoutId: `timeline-focus-${experience.slug}`,
                    layout: true,
                    initial: { opacity: 0, scale: 0.96 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { duration: 0.4, ease: easeOut },
                  }
                : {})}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {formatMonthPeriod(
                  experience.startMonth,
                  experience.endMonth,
                  locale,
                  dictionary.periods
                )}
              </span>
              <span className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {experience.company}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {localized(experience.role, locale)}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {localized(experience.summary, locale)}
              </p>
            </ItemTag>
          );
        })}
      </ul>
    </BlockShell>
  );
}
