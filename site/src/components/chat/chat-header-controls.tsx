'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { LanguageLink } from '@/components/page/language-link.tsx';
import { Button } from '@/components/ui';
import { localePath, otherLocale } from '@/lib/i18n/locales.ts';
import { iconRegistry } from '@/lib/icons';
import { trackLocaleSwitch } from '@/lib/tracking/track-event.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Locale } from '@portfolio/content';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

type ChatHeaderControlsProps = {
  locale: Locale;
  dictionary: Dictionary;
  conversationId?: string;
  quickViewOpen: boolean;
  onToggleQuickView: () => void;
};

export function ChatHeaderControls({
  locale,
  dictionary,
  conversationId,
  quickViewOpen,
  onToggleQuickView,
}: ChatHeaderControlsProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();
  const isDark = theme === 'dark';
  const alternate = otherLocale(locale);
  const SunIcon = iconRegistry.sun;
  const MoonIcon = iconRegistry.moon;
  const themeLabel = isDark ? dictionary.theme.switchToLight : dictionary.theme.switchToDark;
  const quickViewLabel = quickViewOpen
    ? dictionary.chat.quickViewClose
    : dictionary.chat.quickViewOpen;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="glass" onClick={onToggleQuickView}>
        {quickViewLabel}
      </Button>
      <LanguageLink
        locale={alternate}
        href={localePath(alternate)}
        hrefLang={alternate}
        lang={alternate}
        onClick={() => trackLocaleSwitch(locale, alternate, conversationId)}
        className="glass-panel rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
        style={{ color: 'var(--text-muted)' }}
      >
        {alternate.toUpperCase()}
      </LanguageLink>
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={themeLabel}
        className="glass-panel flex cursor-pointer items-center justify-center rounded-full p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mounted && isDark ? (
            <motion.span
              key="sun"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SunIcon size={18} aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MoonIcon size={18} aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
