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
      className="relative z-20 mx-auto flex w-full max-w-[1600px] flex-col gap-16 px-6 py-24 sm:px-12"
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
          </span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="glass-panel relative overflow-hidden rounded-3xl p-6 shadow-2xl lg:p-8"
      >
        <div
          className="relative z-10 max-w-4xl space-y-6 text-lg font-light leading-relaxed sm:text-xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          {data.journeyParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </motion.div>

      {data.features.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, delay: 0.1, ease: easeOut }}
          className="flex flex-col gap-6"
        >
          <h3 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            {data.featuresTitle}
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.features.map((feature) => {
              const Icon = iconRegistry[feature.icon];
              return (
                <div
                  key={feature.title}
                  className="glass-panel group flex cursor-default flex-col gap-4 rounded-3xl p-6"
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
                  <h4 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                    {feature.title}
                  </h4>
                  <p
                    className="text-sm font-light leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {data.technologies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: inViewMargin }}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="flex flex-col gap-6"
        >
          <h3 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            {data.technologiesTitle}
          </h3>
          <div className="glass-panel overflow-x-auto rounded-[2rem] p-6 sm:p-8">
            <table className="w-full border-collapse text-left text-sm sm:text-base">
              <thead>
                <tr style={{ color: 'var(--text-dimmed)' }}>
                  <th
                    scope="col"
                    className="pb-4 pr-6 text-xs font-semibold uppercase tracking-widest"
                  >
                    {data.usageHeader}
                  </th>
                  <th scope="col" className="pb-4 text-xs font-semibold uppercase tracking-widest">
                    {data.technologiesHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.technologies.map((row) => (
                  <tr key={row.usage} className="border-t border-[var(--glass-border)]">
                    <th
                      scope="row"
                      className="py-4 pr-6 align-top font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {row.usage}
                    </th>
                    <td
                      className="py-4 font-light leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {row.technologies.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </section>
  );
}
