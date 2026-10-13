'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';

import type { ProjectsSectionData } from '@/types';

interface ProjectsProps {
  data: ProjectsSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Projects({ data }: ProjectsProps) {
  return (
    <section
      id="projects"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-16 px-6 py-32 sm:px-12"
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
          .
        </h2>
      </motion.div>

      <div className="mt-8 flex w-full flex-col gap-12 lg:gap-16">
        {data.items.map((project) => (
          <motion.article
            key={project.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: inViewMargin }}
            transition={{ duration: 1, ease: easeOut, delay: 0.1 }}
            className="glass-panel relative w-full rounded-[2.5rem] p-8 shadow-2xl md:p-12"
          >
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div
                  className="flex w-fit items-center gap-3 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-widest"
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
                  className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl"
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

              <div className="flex flex-wrap gap-3">
                {project.tech.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm"
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
            </div>
          </motion.article>
        ))}
      </div>

      <p className="mt-4 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
        {data.footnote}
      </p>
    </section>
  );
}
