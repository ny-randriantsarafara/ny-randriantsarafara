'use client';

import { ContactBlockView } from '@/components/chat/blocks/contact-block-view.tsx';
import { CvBlockView } from '@/components/chat/blocks/cv-block-view.tsx';
import { ExperienceBlockView } from '@/components/chat/blocks/experience-block-view.tsx';
import { KeyFiguresBlockView } from '@/components/chat/blocks/key-figures-block-view.tsx';
import { ProjectBlockView } from '@/components/chat/blocks/project-block-view.tsx';
import { SkillsBlockView } from '@/components/chat/blocks/skills-block-view.tsx';
import { StrengthsBlockView } from '@/components/chat/blocks/strengths-block-view.tsx';
import { TimelineBlockView } from '@/components/chat/blocks/timeline-block-view.tsx';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function renderBlock(
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
