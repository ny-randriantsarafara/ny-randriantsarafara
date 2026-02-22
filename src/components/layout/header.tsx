'use client';

import { signOut } from 'next-auth/react';

import { useAdmin } from '@/components/cms/admin-provider';
import { Button } from '@/components/ui';

import type { Link } from '@/types';

interface HeaderProps {
  navLinks: Link[];
  brandName: string;
  roleText: string;
  ctaText: string;
}

export function Header({ navLinks, brandName, roleText, ctaText }: HeaderProps) {
  const { isAdmin } = useAdmin();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#" className="group inline-flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">{brandName}</span>
          <span className="text-xs text-ink/60">{roleText}</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} className="text-sm text-ink/70 hover:text-ink" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button href="#contact" className="rounded-xl px-4 py-2">
            {ctaText}
            <span aria-hidden="true">&rarr;</span>
          </Button>
          {isAdmin && (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-lg px-3 py-2 text-xs text-ink/50 hover:text-ink"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
