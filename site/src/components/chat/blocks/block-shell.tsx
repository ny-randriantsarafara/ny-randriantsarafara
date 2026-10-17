'use client';

import { m, useReducedMotion } from 'motion/react';

import type { ReactNode } from 'react';

export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function BlockShell({
  children,
  ariaLabel,
  layout,
  index,
}: {
  children: ReactNode;
  ariaLabel: string;
  layout: 'stage' | 'inline';
  index: number;
}) {
  const reduced = useReducedMotion();
  const className =
    layout === 'stage'
      ? 'glass-panel min-w-0 w-full rounded-3xl p-5 xl:p-6'
      : 'glass-panel min-w-0 w-full rounded-2xl p-5';

  if (reduced) {
    return (
      <section aria-label={ariaLabel} className={className}>
        {children}
      </section>
    );
  }

  return (
    <m.section
      aria-label={ariaLabel}
      className={className}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut, delay: index * 0.06 }}
    >
      {children}
    </m.section>
  );
}
