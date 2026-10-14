'use client';

import { m, useReducedMotion } from 'motion/react';

import { BlockShell, easeOut } from '@/components/chat/blocks/block-shell.tsx';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function SkillsBlockView({
  block,
  content,
  locale: _locale,
  dictionary,
  layout,
  index,
}: {
  block: Extract<Block, { type: 'skills' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const reduced = useReducedMotion();
  const skills = content.skills.filter((skill) => {
    if (block.highlightSlugs !== undefined) {
      return block.highlightSlugs.includes(skill.slug);
    }
    if (block.capabilitySlug !== undefined) {
      return skill.capabilitySlug === block.capabilitySlug;
    }
    return true;
  });
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.skills} layout={layout} index={index}>
      <ul className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const pillStyle = {
            background: 'var(--tag-bg)',
            border: '1px solid var(--tag-border)',
            color: 'var(--tag-text)',
          };
          if (reduced) {
            return (
              <li key={skill.slug} className="rounded-full px-3 py-1 text-sm" style={pillStyle}>
                {skill.name}
              </li>
            );
          }
          return (
            <m.li
              key={skill.slug}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="rounded-full px-3 py-1 text-sm"
              style={pillStyle}
            >
              {skill.name}
            </m.li>
          );
        })}
      </ul>
    </BlockShell>
  );
}
