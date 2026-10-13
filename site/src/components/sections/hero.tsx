'use client';

import { motion } from 'motion/react';

import { Badge, Button } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

import type { HeroSectionData } from '@/types';

interface HeroProps {
  data: HeroSectionData;
}

const SparklesIcon = iconRegistry.sparkles;
const ArrowUpRightIcon = iconRegistry['arrow-up-right'];
const DownloadIcon = iconRegistry.download;

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Hero({ data }: HeroProps) {
  const [primaryStat] = data.snapshot.stats;

  return (
    <section
      id="hero"
      className="relative flex min-h-screen w-full max-w-[1400px] flex-col items-center justify-between overflow-hidden px-6 py-32 sm:px-12 md:flex-row md:py-0"
    >
      <div className="z-20 flex w-full flex-col items-start gap-8 md:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOut }}
        >
          <Badge>
            <SparklesIcon size={16} aria-hidden="true" className="text-indigo-400" />
            <span>{data.availabilityBadge}</span>
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: easeOut }}
          className="text-5xl font-semibold leading-[1.1] tracking-tight drop-shadow-xl sm:text-7xl lg:text-[6rem]"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.headlinePrefix} <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 bg-clip-text pr-4 italic text-transparent">
            {data.headlineHighlight}
          </span>{' '}
          {data.headlineSuffix}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: easeOut }}
          className="max-w-lg text-lg font-light leading-relaxed sm:text-xl"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.subheadline}
        </motion.p>

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
          <Button href={data.secondaryCta.href} variant="glass" download>
            {data.secondaryCta.label}
            <DownloadIcon
              size={18}
              aria-hidden="true"
              className="opacity-70 group-hover:opacity-100"
            />
          </Button>
          <a
            href={`mailto:${data.email}`}
            className="text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {data.email}
          </a>
        </motion.div>

        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dimmed)' }}>
          {data.tagline}
        </p>
      </div>

      <div className="relative mt-16 hidden h-[500px] w-full md:mt-0 md:block md:h-screen md:w-1/2">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.2, type: 'spring', stiffness: 100 }}
          className="glass-panel absolute left-1/2 top-1/2 z-20 h-[450px] w-[320px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[3rem] sm:w-[380px]"
        >
          <div className="relative z-10 flex h-full flex-col justify-between p-8">
            <div className="flex items-start justify-between">
              <div className="glass-panel flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-lg">
                ⚙️
              </div>
              <span
                className="glass-panel rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {data.snapshot.location}
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <div
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                Current focus
              </div>
              <div
                className="text-2xl font-medium tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {data.snapshot.role}
              </div>
            </div>
          </div>
        </motion.div>

        {primaryStat && (
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: -15 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ duration: 1, delay: 0.4, type: 'spring', stiffness: 80 }}
            className="glass-panel absolute left-[-10%] top-[20%] z-30 rounded-3xl px-6 py-5 shadow-2xl sm:left-[5%]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent">
                {primaryStat.value}
              </div>
              <div
                className="text-xs font-medium uppercase leading-tight tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {primaryStat.label}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: 100, rotate: 15 }}
          animate={{ opacity: 1, x: 0, rotate: 8 }}
          transition={{ duration: 1, delay: 0.6, type: 'spring', stiffness: 80 }}
          className="glass-panel absolute bottom-[15%] right-[-10%] z-10 rounded-[2rem] p-6 shadow-2xl sm:right-[5%]"
        >
          <div className="flex flex-col gap-3">
            <div
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Tech stack
            </div>
            <div className="flex flex-wrap gap-2">
              {data.snapshot.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
