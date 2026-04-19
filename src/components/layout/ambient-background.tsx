'use client';

import { motion } from 'motion/react';

const noiseDataUrl =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";

export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <motion.div
        animate={{ x: ['-10%', '10%', '-10%'], y: ['-10%', '20%', '-10%'], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 top-0 h-[50vw] w-[50vw] rounded-full blur-[120px]"
        style={{ background: 'rgba(99,102,241,0.12)' }}
      />
      <motion.div
        animate={{ x: ['10%', '-20%', '10%'], y: ['10%', '-10%', '10%'], scale: [1, 1.2, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-0 right-[-10%] h-[60vw] w-[60vw] rounded-full blur-[120px]"
        style={{ background: 'rgba(244,63,94,0.10)' }}
      />
      <motion.div
        animate={{ x: ['-20%', '20%', '-20%'], y: ['20%', '-20%', '20%'], scale: [1, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute left-[30%] top-[30%] h-[40vw] w-[40vw] rounded-full blur-[120px]"
        style={{ background: 'rgba(20,184,166,0.10)' }}
      />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: noiseDataUrl }} />
    </div>
  );
}
