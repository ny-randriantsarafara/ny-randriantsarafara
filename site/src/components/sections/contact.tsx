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
      className="relative z-20 mx-auto mb-24 flex w-full max-w-[1600px] flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-12 lg:py-24"
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
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-rose-500 bg-clip-text pr-6 italic text-transparent">
            {data.headlineHighlight}
          </span>
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
        className="glass-panel z-10 mt-16 flex w-full max-w-xl flex-col gap-8 rounded-3xl p-6 backdrop-blur-3xl lg:p-8"
      >
        <h3
          className="text-2xl font-medium tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.channelsTitle}
        </h3>
        <ContactChannelLinks locale={locale} channels={data.channels} />
      </motion.div>
    </section>
  );
}
