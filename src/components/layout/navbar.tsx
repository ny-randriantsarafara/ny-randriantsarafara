'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { useScrollSpy } from '@/hooks';
import { iconRegistry } from '@/lib/icons';

import type { IconName } from '@/lib/icons';

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

const navItems: readonly NavItem[] = [
  { id: 'hero', href: '#hero', label: 'Home', icon: 'home' },
  { id: 'about', href: '#about', label: 'About', icon: 'user' },
  { id: 'projects', href: '#projects', label: 'Work', icon: 'layers' },
  { id: 'experience', href: '#experience', label: 'Experience', icon: 'briefcase' },
  { id: 'contact', href: '#contact', label: 'Contact', icon: 'mail' },
];

const navIds = navItems.map((item) => item.id);

export function Navbar() {
  const activeId = useScrollSpy(navIds);
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const isDark = theme === 'dark';
  const SunIcon = iconRegistry.sun;
  const MoonIcon = iconRegistry.moon;

  return (
    <motion.nav
      aria-label="Primary"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-2"
    >
      {navItems.map((item) => {
        const Icon = iconRegistry[item.icon];
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="relative flex items-center justify-center rounded-full p-3 transition-colors duration-300 sm:px-5 sm:py-3"
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

      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
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
