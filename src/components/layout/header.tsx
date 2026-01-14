'use client';

import { Button } from '@/components/ui';

const navLinks = [
  { label: 'Proof', href: '#proof' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'How I work', href: '#how' },
  { label: 'Contact', href: '#contact' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#" className="group inline-flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">Ny Hasinavalona</span>
          <span className="text-xs text-ink/60">Senior Software Engineer</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} className="text-sm text-ink/70 hover:text-ink" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <Button href="#contact" className="rounded-xl px-4 py-2">
          Let&apos;s talk
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </header>
  );
}
