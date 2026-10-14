'use client';

import { motion, useReducedMotion } from 'motion/react';

type RevealedTextProps = {
  text: string;
  className?: string;
};

export function RevealedText({ text, className }: RevealedTextProps) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <p className={className} style={{ color: 'var(--text-secondary)' }}>
        {text}
      </p>
    );
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  return (
    <p className={className} style={{ color: 'var(--text-secondary)' }}>
      <span className="sr-only">{text}</span>
      {words.map((word, index) => (
        <motion.span
          key={`${index}-${word}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: index * 0.025 }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </p>
  );
}
