'use client';

import { motion, useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui';
import { filterRenderableBlocks } from '@/lib/chat/block-resolver.ts';
import { cvPath } from '@/lib/i18n/locales.ts';
import { formatMonthPeriod, formatYearPeriod, skillNames } from '@/lib/publication/sections.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';
import type { ReactNode } from 'react';

type BlockRendererProps = {
  blocks: readonly Block[];
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  onOpenContact?: (topic: string | undefined) => void;
  layout?: 'stage' | 'inline';
};

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

function BlockShell({
  children,
  ariaLabel,
  layout,
  index,
}: {
  children: ReactNode;
  ariaLabel: string;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const reduced = useReducedMotion();
  const className =
    layout === 'stage'
      ? 'glass-panel w-full rounded-[2rem] p-6 md:p-8'
      : 'glass-panel w-full rounded-2xl p-5';

  if (reduced) {
    return (
      <section aria-label={ariaLabel} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      aria-label={ariaLabel}
      className={className}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut, delay: index * 0.06 }}
    >
      {children}
    </motion.section>
  );
}

function localized(text: { en: string; fr: string }, locale: Locale): string {
  return text[locale];
}

function localizedBullets(list: { en: readonly string[]; fr: readonly string[] }, locale: Locale) {
  if (locale === 'fr') {
    return list.fr;
  }
  return list.en;
}

function TimelineBlockView({
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
        {experiences.map((experience) => (
          <li
            key={experience.slug}
            className="flex flex-col gap-1 border-l-2 border-indigo-400/40 pl-4"
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {formatMonthPeriod(
                experience.startMonth,
                experience.endMonth,
                locale,
                dictionary.periods.present
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
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

function ExperienceBlockView({
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
  const experience = content.experiences.find((item) => item.slug === block.slug);
  if (experience === undefined) {
    return null;
  }
  const tech = skillNames(experience.skillSlugs, content.skills);
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.experience} layout={layout} index={index}>
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
            dictionary.periods.present
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
    </BlockShell>
  );
}

function ProjectBlockView({
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
  const project = content.projects.find((item) => item.slug === block.slug);
  if (project === undefined) {
    return null;
  }
  const tech = skillNames(project.skillSlugs, content.skills);
  const caseStudy = project.caseStudy === null ? null : localized(project.caseStudy, locale);
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.project} layout={layout} index={index}>
      <h3 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
        {localized(project.title, locale)}
      </h3>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-dimmed)' }}>
        {formatYearPeriod(project.startYear, project.endYear, dictionary.periods.present)}
        {project.company !== null ? ` · ${project.company}` : ''}
      </p>
      <p className="mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {localized(project.summary, locale)}
      </p>
      {caseStudy !== null && caseStudy.trim().length > 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--glass-border)] p-4">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {dictionary.chat.blocks.caseStudy}
          </h4>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {caseStudy}
          </p>
        </div>
      )}
      {tech.length > 0 && (
        <p className="mt-4 text-sm" style={{ color: 'var(--text-dimmed)' }}>
          {tech.join(' · ')}
        </p>
      )}
    </BlockShell>
  );
}

function SkillsBlockView({
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
        {skills.map((skill) => (
          <li
            key={skill.slug}
            className="rounded-full px-3 py-1 text-sm"
            style={{
              background: 'var(--tag-bg)',
              border: '1px solid var(--tag-border)',
              color: 'var(--tag-text)',
            }}
          >
            {skill.name}
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

function KeyFiguresBlockView({
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
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {figures.map((figure) => (
          <div key={figure.slug}>
            <dt className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {figure.value}
            </dt>
            <dd className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {localized(figure.label, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </BlockShell>
  );
}

function StrengthsBlockView({
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

function ContactBlockView({
  block,
  content,
  dictionary,
  layout,
  index,
  onOpenContact,
}: {
  block: Extract<Block, { type: 'contact' }>;
  content: PublicationContent;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
  onOpenContact?: (topic: string | undefined) => void;
}) {
  const profile = content.profile;
  const topic = block.topic;
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.contact} layout={layout} index={index}>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {dictionary.chat.blocks.contactPrompt}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button href={`mailto:${profile.email}`} variant="primary">
          {dictionary.contact.channelEmail}
        </Button>
        <Button href={profile.linkedinUrl} variant="glass" external>
          {dictionary.contact.channelLinkedin}
        </Button>
        {onOpenContact !== undefined && (
          <Button type="button" variant="glass" onClick={() => onOpenContact(topic)}>
            {dictionary.chat.blocks.openContact}
          </Button>
        )}
      </div>
    </BlockShell>
  );
}

function CvBlockView({
  locale,
  dictionary,
  layout,
  index,
}: {
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
}) {
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.cv} layout={layout} index={index}>
      <Button href={cvPath(locale)} variant="primary">
        {dictionary.chat.blocks.downloadCv}
      </Button>
    </BlockShell>
  );
}

function renderBlock(
  block: Block,
  content: PublicationContent,
  locale: Locale,
  dictionary: Dictionary,
  layout: 'stage' | 'inline',
  index: number,
  onOpenContact?: (topic: string | undefined) => void
) {
  if (block.type === 'timeline') {
    return (
      <TimelineBlockView
        key={`timeline-${index}`}
        block={block}
        content={content}
        locale={locale}
        dictionary={dictionary}
        layout={layout}
        index={index}
      />
    );
  }
  if (block.type === 'experience') {
    return (
      <ExperienceBlockView
        key={`experience-${block.slug}`}
        block={block}
        content={content}
        locale={locale}
        dictionary={dictionary}
        layout={layout}
        index={index}
      />
    );
  }
  if (block.type === 'project') {
    return (
      <ProjectBlockView
        key={`project-${block.slug}`}
        block={block}
        content={content}
        locale={locale}
        dictionary={dictionary}
        layout={layout}
        index={index}
      />
    );
  }
  if (block.type === 'skills') {
    return (
      <SkillsBlockView
        key={`skills-${index}`}
        block={block}
        content={content}
        locale={locale}
        dictionary={dictionary}
        layout={layout}
        index={index}
      />
    );
  }
  if (block.type === 'key-figures') {
    return (
      <KeyFiguresBlockView
        key={`figures-${index}`}
        block={block}
        content={content}
        locale={locale}
        dictionary={dictionary}
        layout={layout}
        index={index}
      />
    );
  }
  if (block.type === 'strengths') {
    return (
      <StrengthsBlockView
        key={`strengths-${block.answerSlug}`}
        block={block}
        content={content}
        locale={locale}
        dictionary={dictionary}
        layout={layout}
        index={index}
      />
    );
  }
  if (block.type === 'contact') {
    return (
      <ContactBlockView
        key={`contact-${index}`}
        block={block}
        content={content}
        dictionary={dictionary}
        layout={layout}
        index={index}
        onOpenContact={onOpenContact}
      />
    );
  }
  return (
    <CvBlockView
      key={`cv-${index}`}
      locale={locale}
      dictionary={dictionary}
      layout={layout}
      index={index}
    />
  );
}

export function BlockRenderer({
  blocks,
  content,
  locale,
  dictionary,
  onOpenContact,
  layout = 'stage',
}: BlockRendererProps) {
  const renderable = filterRenderableBlocks(blocks, content);
  return (
    <div className="flex w-full flex-col gap-4">
      {renderable.map((block, index) =>
        renderBlock(block, content, locale, dictionary, layout, index, onOpenContact)
      )}
    </div>
  );
}
