'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';

import type { ExperienceSectionData } from '@/types';

interface ExperienceProps {
  data: ExperienceSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Experience({ data }: ExperienceProps) {
  return (
    <section
      id="experience"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-12 px-6 py-32 sm:px-12 lg:flex-row lg:gap-16"
    >
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex h-fit w-full flex-col gap-6 lg:sticky lg:top-32 lg:w-1/3"
      >
        <Badge accent="rose">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-5xl lg:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-rose-500 to-indigo-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
        <p
          className="mt-4 max-w-sm font-light leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.description}
        </p>
      </motion.div>

      <div className="flex w-full flex-col gap-8 lg:w-2/3">
        {data.items.map((item, index) => (
          <motion.article
            key={`${item.company}-${item.period}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: easeOut, delay: index * 0.05 }}
            className="glass-panel relative flex flex-col gap-6 overflow-hidden rounded-[2.5rem] p-8 shadow-2xl md:p-10"
          >
            <header className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <h3
                className="text-2xl font-medium lg:text-3xl"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.company}
              </h3>
              <span
                className="w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {item.period}
              </span>
            </header>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h4 className="text-xl font-medium italic text-rose-400">{item.role}</h4>
                <span className="text-sm" style={{ color: 'var(--text-dimmed)' }}>
                  {item.location}
                </span>
              </div>
              <ul
                className="ml-5 list-disc space-y-2 text-base font-light leading-relaxed md:text-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>

            <div className="relative z-10 mt-2 flex flex-wrap gap-2">
              {item.tech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-xl px-4 py-2 text-sm font-medium"
                  style={{
                    background: 'var(--tag-bg)',
                    border: '1px solid var(--tag-border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.article>
        ))}

        <p className="mt-2 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
          {data.earlierLine}
        </p>
      </div>
    </section>
  );
}
