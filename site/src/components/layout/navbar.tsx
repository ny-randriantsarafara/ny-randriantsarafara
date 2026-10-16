'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { useScrollSpy } from '@/hooks';
import { localePath, otherLocale } from '@/lib/i18n/locales.ts';
import { iconRegistry } from '@/lib/icons';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { IconName } from '@/lib/icons';
import type { Locale } from '@portfolio/content';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: IconName;
}

interface NavbarProps {
  locale: Locale;
  dictionary: Dictionary;
}

const navLinkFocusClasses =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]';

function navItemsFor(dictionary: Dictionary): readonly NavItem[] {
  return [
    { id: 'hero', href: '#hero', label: dictionary.nav.home, icon: 'home' },
    { id: 'about', href: '#about', label: dictionary.nav.about, icon: 'user' },
    { id: 'projects', href: '#projects', label: dictionary.nav.work, icon: 'layers' },
    { id: 'experience', href: '#experience', label: dictionary.nav.experience, icon: 'briefcase' },
    { id: 'contact', href: '#contact', label: dictionary.nav.contact, icon: 'mail' },
  ];
}

export function Navbar({ locale, dictionary }: NavbarProps) {
  const items = navItemsFor(dictionary);
  const navIds = items.map((item) => item.id);
  const activeId = useScrollSpy(navIds);
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const isDark = theme === 'dark';
  const SunIcon = iconRegistry.sun;
  const MoonIcon = iconRegistry.moon;
  const alternate = otherLocale(locale);
  const languageCode = alternate.toUpperCase();
  const themeLabel = isDark ? dictionary.theme.switchToLight : dictionary.theme.switchToDark;

  return (
    <motion.nav
      aria-label={dictionary.nav.ariaLabel}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-0 rounded-full px-2 py-2 min-[380px]:gap-1"
    >
      {items.map((item) => {
        const Icon = iconRegistry[item.icon];
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex items-center justify-center rounded-full p-3 transition-colors duration-300 sm:px-5 sm:py-3 ${navLinkFocusClasses}`}
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="navbar-active-pill"
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--glass-bg-strong)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              <span
                className={`hidden overflow-hidden text-sm font-medium transition-all duration-300 sm:block ${
                  isActive ? 'ml-1 w-auto opacity-100' : 'm-0 w-0 opacity-0'
                }`}
              >
                {item.label}
              </span>
            </span>
          </a>
        );
      })}

      <span
        aria-hidden="true"
        className="mx-1 h-6 w-px"
        style={{ background: 'var(--glass-border)' }}
      />

      <a
        href={localePath(alternate)}
        hrefLang={alternate}
        lang={alternate}
        aria-label={dictionary.language.switchLabel}
        className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-widest ${navLinkFocusClasses}`}
        style={{ color: 'var(--text-muted)' }}
      >
        {languageCode}
      </a>

      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={themeLabel}
        className="relative flex cursor-pointer items-center justify-center rounded-full p-3 transition-colors duration-300"
        style={{ color: 'var(--text-muted)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mounted && isDark ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
            >
              <SunIcon size={20} strokeWidth={1.5} aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
            >
              <MoonIcon size={20} strokeWidth={1.5} aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.nav>
  );
}
