import { Geist } from 'next/font/google';

import { JsEnableScript } from '@/components/page/js-enable-script.tsx';
import { ThemeProvider } from '@/components/providers';
import { buildContentSecurityPolicy, defaultApiUrl } from '@/lib/seo/content-security-policy.ts';

import type { Locale } from '@portfolio/content';
import type { ReactNode } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

interface RootDocumentProps {
  locale: Locale;
  children: ReactNode;
}

export function RootDocument({ locale, children }: RootDocumentProps) {
  const policy = buildContentSecurityPolicy(defaultApiUrl());

  return (
    <html lang={locale} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element -- CSP meta belongs on the locale root layout. */}
      <head>
        <meta httpEquiv="Content-Security-Policy" content={policy} />
        <JsEnableScript />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
