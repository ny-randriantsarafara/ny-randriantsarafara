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
const DownloadIcon = iconRegistry.download;

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Hero({ data }: HeroProps) {
  const { openConversation } = useConversationBridge();

  return (
    <section
      id="hero"
      className="relative flex min-h-screen w-full max-w-[1400px] flex-col justify-center gap-12 px-6 py-32 sm:px-12 md:flex-row md:items-center md:gap-16"
    >
      <div className="z-20 flex w-full flex-col items-start gap-8 md:w-3/5">
        <h1
          className="text-5xl font-semibold leading-[1.1] tracking-tight drop-shadow-xl sm:text-7xl lg:text-[6rem]"
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
          <Button href={data.secondaryCta.href} variant="glass" download>
            {data.secondaryCta.label}
            <DownloadIcon
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
          className="glass-panel z-20 flex w-full flex-col gap-6 rounded-[2.5rem] p-8 shadow-2xl md:w-2/5 md:p-10"
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
