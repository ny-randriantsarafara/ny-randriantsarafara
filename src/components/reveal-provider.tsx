'use client';

import { useReveal } from '@/hooks';

export function RevealProvider({ children }: { children: React.ReactNode }) {
  useReveal();
  return <>{children}</>;
}
