'use client';

import { useState } from 'react';

import { Button } from '@/components/ui';

import type { ContactSectionData } from '@/types';

interface ContactProps {
  data: ContactSectionData;
}

export function Contact({ data }: ContactProps) {
  const [year] = useState(new Date().getFullYear());

  return (
    <>
      <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h2>
          <p className="mt-3 text-paper/75">{data.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {data.links.map((link, index) => (
            <Button
              key={link.label}
              variant={index === 0 ? 'inverse' : 'ghost'}
              href={link.href}
              className={
                index > 0
                  ? 'rounded-2xl border border-paper/20 px-5 py-3 text-paper hover:border-paper/35'
                  : ''
              }
            >
              {link.label}
            </Button>
          ))}
        </div>
      </div>

      <footer className="reveal mt-10 flex flex-col gap-2 border-t border-paper/10 pt-6 text-xs text-paper/60 md:flex-row md:items-center md:justify-between">
        <p>
          © {year} {data.footer.copyright}
        </p>
        <p>{data.footer.tagline}</p>
      </footer>
    </>
  );
}
