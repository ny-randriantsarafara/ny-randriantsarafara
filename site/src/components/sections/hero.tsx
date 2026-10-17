'use client';

import { motion } from 'motion/react';

import { useConversationBridge } from '@/components/providers';
import { Button } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { HeroSectionData } from '@/types';

interface HeroProps {
  data: HeroSectionData;
}

const ArrowUpRightIcon = iconRegistry['arrow-up-right'];
const MessageCircleIcon = iconRegistry['message-circle'];

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Hero({ data }: HeroProps) {
  const { openConversation } = useConversationBridge();

  return (
    <section
      id="hero"
      className="relative mx-auto grid min-h-[min(100svh,900px)] w-full max-w-[1600px] grid-cols-1 content-center gap-12 px-6 py-20 sm:px-12 lg:py-24 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center md:gap-12"
    >
      <div className="z-20 flex w-full min-w-0 flex-col items-start gap-8">
        <h1
          className="text-5xl font-semibold leading-[1.1] tracking-tight drop-shadow-xl sm:text-6xl xl:text-7xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix}{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text pr-4 italic text-transparent">
            {data.headlineHighlight}
          </span>
        </h1>

        <div
          className="flex max-w-xl flex-col gap-4 text-lg font-light leading-relaxed sm:text-xl"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: easeOut }}
          className="mt-4 flex flex-wrap items-center gap-4"
        >
          <Button href={data.primaryCta.href}>
            {data.primaryCta.label}
            <ArrowUpRightIcon
              size={18}
              aria-hidden="true"
              className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </Button>
          <Button
            variant="glass"
            className="js-only"
            onClick={() => openConversation({ kind: 'compose' })}
          >
            {data.askLabel}
            <MessageCircleIcon
              size={18}
              aria-hidden="true"
              className="opacity-70 group-hover:opacity-100"
            />
          </Button>
        </motion.div>
      </div>

      {data.facts.length > 0 && (
        <motion.dl
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="glass-panel z-20 flex w-full min-w-0 flex-col gap-6 rounded-3xl p-6 shadow-2xl lg:p-8"
        >
          {data.facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1">
              <dt
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-dimmed)' }}
              >
                {fact.label}
              </dt>
              <dd className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {fact.value}
              </dd>
            </div>
          ))}
        </motion.dl>
      )}
    </section>
  );
}
