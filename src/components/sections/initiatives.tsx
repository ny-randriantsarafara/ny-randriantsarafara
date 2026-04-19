'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { InitiativesSectionData } from '@/types';

interface InitiativesProps {
  data: InitiativesSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Initiatives({ data }: InitiativesProps) {
  return (
    <section
      id="initiatives"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-12 px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex max-w-3xl flex-col gap-6"
      >
        <Badge accent="teal">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-5xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
        <p className="font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {data.description}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {data.items.map((item, index) => {
          const Icon = iconRegistry[item.icon];
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: inViewMargin }}
              transition={{ duration: 0.8, ease: easeOut, delay: index * 0.1 }}
              className="glass-panel flex flex-col gap-4 rounded-[2rem] p-8"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <header>
                <h3 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-1 text-sm italic text-indigo-400">{item.subtitle}</p>
              </header>
              <p
                className="text-sm font-light leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.description}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-medium"
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
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
