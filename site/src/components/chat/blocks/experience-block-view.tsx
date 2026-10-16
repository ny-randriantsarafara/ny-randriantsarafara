'use client';

import { m, useReducedMotion } from 'motion/react';

import { BlockShell, easeOut } from '@/components/chat/blocks/block-shell.tsx';
import { localized, localizedBullets } from '@/components/chat/blocks/localized.ts';
import { formatMonthPeriod, skillNames } from '@/lib/publication/sections.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function ExperienceBlockView({
  block,
  content,
  locale,
  dictionary,
  layout,
  index,
}: {
  block: Extract<Block, { type: 'experience' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const reduced = useReducedMotion();
  const experience = content.experiences.find((item) => item.slug === block.slug);
  if (experience === undefined) {
    return null;
  }
  const tech = skillNames(experience.skillSlugs, content.skills);
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.experience} layout={layout} index={index}>
      {!reduced && layout === 'stage' ? (
        <m.div
          layoutId={`experience-stage-${block.slug}`}
          layout
          className="flex flex-col"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: easeOut }}
        >
          <ExperienceDetail
            experience={experience}
            locale={locale}
            dictionary={dictionary}
            tech={tech}
          />
        </m.div>
      ) : (
        <ExperienceDetail
          experience={experience}
          locale={locale}
          dictionary={dictionary}
          tech={tech}
        />
      )}
    </BlockShell>
  );
}

function ExperienceDetail({
  experience,
  locale,
  dictionary,
  tech,
}: {
  experience: PublicationContent['experiences'][number];
  locale: Locale;
  dictionary: Dictionary;
  tech: readonly string[];
}) {
  return (
    <>
      <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
          {experience.company}
        </h3>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-dimmed)' }}
        >
          {formatMonthPeriod(
            experience.startMonth,
            experience.endMonth,
            locale,
            dictionary.periods
          )}
        </span>
      </header>
      <p className="text-lg italic text-rose-400">{localized(experience.role, locale)}</p>
      <p className="mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {localized(experience.summary, locale)}
      </p>
      <ul
        className="mt-4 list-disc space-y-2 pl-5 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        {localizedBullets(experience.highlights, locale).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {tech.length > 0 && (
        <p className="mt-4 text-sm" style={{ color: 'var(--text-dimmed)' }}>
          {tech.join(' · ')}
        </p>
      )}
    </>
  );
}
