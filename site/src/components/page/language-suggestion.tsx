'use client';

import { useSyncExternalStore } from 'react';

import { prefersFrench } from '@/lib/i18n/prefers-french.ts';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

interface LanguageSuggestionProps {
  linkLabel: string;
}

export function LanguageSuggestion({ linkLabel }: LanguageSuggestionProps) {
  const mounted = useHasMounted();
  if (!mounted) {
    return null;
  }
  if (!prefersFrench(navigator.languages)) {
    return null;
  }
  return (
    <p className="fixed right-6 top-6 z-40 text-sm" style={{ color: 'var(--text-muted)' }}>
      <a
        href="/fr"
        hrefLang="fr"
        lang="fr"
        className="underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
      >
        {linkLabel}
      </a>
    </p>
  );
}
