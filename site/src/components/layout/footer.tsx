'use client';

import { motion } from 'motion/react';

import type { FooterSectionData } from '@/types';

interface FooterProps {
  data: FooterSectionData;
  privacyHref: string;
  privacyLabel: string;
}

export function Footer({ data, privacyHref, privacyLabel }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative z-10 w-full px-6 py-12 backdrop-blur-3xl sm:px-12"
      style={{ background: 'var(--footer-bg)', borderTop: '1px solid var(--footer-border)' }}
    >
      <div
        className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 text-xs font-medium uppercase tracking-widest md:flex-row"
        style={{ color: 'var(--text-dimmed)' }}
      >
        <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
          <span>© {year}</span>
          <span
            aria-hidden="true"
            className="h-px w-4"
            style={{ background: 'var(--glass-border)' }}
          />
          <span>{data.copyright}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <a
            href="#hero"
            className="group flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{data.backToTop}</span>
            <motion.span
              aria-hidden="true"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ↑
            </motion.span>
          </a>
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--glass-border)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>{data.location}</span>
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--glass-border)' }}
          />
          <a
            href={privacyHref}
            className="transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] focus-visible:ring-offset-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {privacyLabel}
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-dimmed)' }}>
        {data.tagline}
      </p>
    </footer>
  );
}
