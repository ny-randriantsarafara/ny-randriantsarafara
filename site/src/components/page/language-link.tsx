'use client';

import { rememberLocale } from '@/lib/i18n/visitor-locale.ts';

import type { Locale } from '@portfolio/content';
import type { ComponentProps } from 'react';

type LanguageLinkProps = ComponentProps<'a'> & { locale: Locale };

export function LanguageLink({ locale, onClick, ...props }: LanguageLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        rememberLocale(event, locale);
        onClick?.(event);
      }}
    />
  );
}
