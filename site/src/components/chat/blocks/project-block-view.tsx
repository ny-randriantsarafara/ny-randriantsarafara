'use client';

import { m, useReducedMotion } from 'motion/react';

import { BlockShell, easeOut } from '@/components/chat/blocks/block-shell.tsx';
import { localized } from '@/components/chat/blocks/localized.ts';
import { formatYearPeriod, skillNames } from '@/lib/publication/sections.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function ProjectBlockView({
  block,
  content,
  locale,
  dictionary,
  layout,
  index,
}: {
  block: Extract<Block, { type: 'project' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const reduced = useReducedMotion();
  const project = content.projects.find((item) => item.slug === block.slug);
  if (project === undefined) {
    return null;
  }
  const tech = skillNames(project.skillSlugs, content.skills);
  const caseStudy = project.caseStudy === null ? null : localized(project.caseStudy, locale);
  const CaseStudyTag = reduced ? 'div' : m.div;
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.project} layout={layout} index={index}>
      {!reduced && layout === 'stage' ? (
        <m.h3
          layoutId={`project-card-${block.slug}`}
          layout
          className="text-2xl font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {localized(project.title, locale)}
        </m.h3>
      ) : (
        <h3 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
          {localized(project.title, locale)}
        </h3>
      )}
      <p className="mt-2 text-sm" style={{ color: 'var(--text-dimmed)' }}>
        {formatYearPeriod(project.startYear, project.endYear, dictionary.periods.present)}
        {project.company !== null ? ` · ${project.company}` : ''}
      </p>
      <p className="mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {localized(project.summary, locale)}
      </p>
      {caseStudy !== null && caseStudy.trim().length > 0 && (
        <CaseStudyTag
          className="mt-6 rounded-2xl border border-[var(--glass-border)] p-4"
          {...(!reduced && layout === 'stage'
            ? {
                layoutId: `project-case-${block.slug}`,
                layout: true,
                initial: { opacity: 0, height: 0 },
                animate: { opacity: 1, height: 'auto' },
                transition: { duration: 0.45, ease: easeOut },
              }
            : {})}
        >
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {dictionary.chat.blocks.caseStudy}
          </h4>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {caseStudy}
          </p>
        </CaseStudyTag>
      )}
      {tech.length > 0 && (
        <p className="mt-4 text-sm" style={{ color: 'var(--text-dimmed)' }}>
          {tech.join(' · ')}
        </p>
      )}
    </BlockShell>
  );
}
