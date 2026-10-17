'use client';

import { motion } from 'motion/react';

import { useConversationBridge } from '@/components/providers';
import { Badge } from '@/components/ui';
import { MarkdownText } from '@/components/ui/markdown-text.tsx';
import { iconRegistry } from '@/lib/icons';

import type { ProjectsSectionData } from '@/types';

interface ProjectsProps {
  data: ProjectsSectionData;
}

const MessageCircleIcon = iconRegistry['message-circle'];

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Projects({ data }: ProjectsProps) {
  const { openConversation } = useConversationBridge();

  return (
    <section
      id="projects"
      className="relative z-20 mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-6 py-20 sm:px-12 lg:py-24"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex w-full flex-col gap-6"
      >
        <Badge accent="teal">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>
        </h2>
        <p
          className="max-w-3xl text-lg font-light leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.introduction}
        </p>
      </motion.div>

      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
        {data.items.map((project) => (
          <motion.article
            key={project.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: inViewMargin }}
            transition={{ duration: 1, ease: easeOut, delay: 0.1 }}
            className="glass-panel relative flex min-w-0 flex-col rounded-3xl p-6 shadow-2xl lg:p-8"
          >
            <div className="flex h-full flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div
                  className="flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-widest"
                  style={{
                    background: 'var(--tag-bg)',
                    borderColor: 'var(--tag-border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{project.year}</span>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--text-dimmed)' }}
                  />
                  <span>{project.role}</span>
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full"
                    style={{ background: 'var(--text-dimmed)' }}
                  />
                  <span>{project.company}</span>
                </div>
                <h3
                  className="text-3xl font-semibold leading-tight tracking-tight lg:text-4xl"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {project.title}
                </h3>
              </div>

              <p
                className="max-w-3xl text-lg font-light leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {project.description}
              </p>

              {project.caseStudy !== null && (
                <details className="group max-w-3xl rounded-2xl border border-[var(--glass-border)] p-5">
                  <summary
                    className="cursor-pointer text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {data.caseStudyLabel}
                  </summary>
                  <div
                    className="mt-4 text-base font-light leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <MarkdownText source={project.caseStudy} headingLevel={4} />
                  </div>
                </details>
              )}

              <div className="mt-auto flex flex-wrap gap-2">
                {project.tech.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-xl px-3 py-1.5 text-sm font-medium shadow-sm"
                    style={{
                      background: 'var(--tag-bg)',
                      border: '1px solid var(--tag-border)',
                      color: 'var(--tag-text)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {project.followUpQuestion !== null && (
                <FollowUpQuestion
                  question={project.followUpQuestion}
                  onAsk={(question) => openConversation({ kind: 'ask', question })}
                />
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function FollowUpQuestion({
  question,
  onAsk,
}: {
  question: string;
  onAsk: (question: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAsk(question)}
      className="js-only group flex w-fit max-w-full items-center gap-3 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--glass-bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
      style={{ color: 'var(--text-primary)', background: 'var(--glass-bg-subtle)' }}
    >
      <MessageCircleIcon size={18} aria-hidden="true" className="shrink-0 text-indigo-400" />
      <span>{question}</span>
    </button>
  );
}
