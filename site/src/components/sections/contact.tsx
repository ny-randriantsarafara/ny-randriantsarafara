'use client';

import { motion } from 'motion/react';

import { ContactChannelLinks } from '@/components/sections/contact-channel-links.tsx';
import { Badge } from '@/components/ui';

import type { ContactSectionData } from '@/types';
import type { Locale } from '@portfolio/content';

interface ContactProps {
  locale: Locale;
  data: ContactSectionData;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const inViewMargin = '-100px';

export function Contact({ locale, data }: ContactProps) {
  return (
    <section
      id="contact"
      className="relative z-20 mb-24 flex w-full max-w-[1400px] flex-col items-center justify-center overflow-hidden px-6 py-32 sm:px-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, ease: easeOut }}
        className="z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <Badge accent="indigo" className="mb-8">
          {data.eyebrow}
        </Badge>
        <h2
          className="text-5xl font-medium leading-[0.95] tracking-tighter sm:text-7xl lg:text-[7rem]"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-rose-500 bg-clip-text pr-6 italic text-transparent">
            {data.headlineHighlight}
          </span>
          .
        </h2>
        <p className="mt-6 max-w-xl text-lg font-light" style={{ color: 'var(--text-muted)' }}>
          {data.description}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: inViewMargin }}
        transition={{ duration: 1, delay: 0.2, ease: easeOut }}
        className="glass-panel z-10 mt-16 grid w-full max-w-3xl grid-cols-1 gap-12 rounded-[3rem] p-8 backdrop-blur-3xl md:p-12 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-8">
          <h3
            className="text-2xl font-medium tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.ctaLabel}
          </h3>
          <ContactChannelLinks locale={locale} channels={data.channels} />
        </div>

        <dl className="flex flex-col gap-6">
          {data.details.map((detail) => (
            <div key={detail.label} className="flex flex-col gap-1">
              <dt
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-dimmed)' }}
              >
                {detail.label}
              </dt>
              <dd className="text-base font-light" style={{ color: 'var(--text-secondary)' }}>
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}
