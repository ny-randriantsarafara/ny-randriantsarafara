'use client';

import { motion } from 'motion/react';

import { Badge } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { AboutSectionData } from '@/types';

interface AboutProps {
  data: AboutSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function About({ data }: AboutProps) {
  return (
    <section
      id="about"
      className="relative z-20 flex w-full max-w-[1400px] flex-col gap-16 px-6 py-24 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="flex w-full max-w-3xl flex-col gap-6"
      >
        <Badge accent="indigo">{data.eyebrow}</Badge>
        <h2
          className="text-4xl font-medium leading-tight tracking-tight md:text-6xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-rose-500 bg-clip-text italic text-transparent">
            {data.headlineHighlight}
          </span>{' '}
          {data.headlineSuffix}
        </h2>
      </motion.div>

      <div className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-6 md:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, ease: easeOut }}
          className="glass-panel relative row-span-2 overflow-hidden rounded-[2.5rem] p-8 shadow-2xl sm:p-12 md:col-span-8"
        >
          <h3
            className="mb-6 text-2xl font-medium sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.journey.title}
          </h3>
          <div
            className="relative z-10 space-y-6 text-lg font-light leading-relaxed sm:text-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            {data.journey.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, delay: 0.1, ease: easeOut }}
          className="glass-panel row-span-1 flex flex-col items-center justify-center rounded-[2.5rem] p-8 text-center shadow-2xl md:col-span-4"
        >
          <div
            className="mb-2 text-5xl font-semibold tracking-tighter sm:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.stat.value}
          </div>
          <div
            className="text-sm font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {data.stat.label}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="glass-panel row-span-1 flex flex-col justify-between rounded-[2.5rem] p-8 shadow-2xl md:col-span-4"
        >
          <h3
            className="mb-6 text-sm font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {data.coreStack.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.coreStack.items.map((item) => (
              <span
                key={item}
                className="rounded-xl px-4 py-2 text-sm font-medium"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--tag-text)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, delay: 0.3, ease: easeOut }}
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {data.features.map((feature) => {
          const Icon = iconRegistry[feature.icon];
          return (
            <div
              key={feature.title}
              className="glass-panel group flex cursor-default flex-col gap-4 rounded-[2rem] p-8"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                {feature.title}
              </h3>
              <p
                className="text-sm font-light leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}
