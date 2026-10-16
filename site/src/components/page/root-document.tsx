import { Geist } from 'next/font/google';

import { JsEnableScript } from '@/components/page/js-enable-script.tsx';
import { ThemeProvider } from '@/components/providers';
import { documentLanguage } from '@/lib/i18n/locales.ts';
import { visitorLocaleScript } from '@/lib/i18n/visitor-locale.ts';
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
    <html lang={documentLanguage(locale)} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element -- CSP meta belongs on the locale root layout. */}
      <head>
        <meta httpEquiv="Content-Security-Policy" content={policy} />
        <style>{'html[data-locale-pending] body{visibility:hidden;pointer-events:none}'}</style>
        <script dangerouslySetInnerHTML={{ __html: visitorLocaleScript(defaultApiUrl()) }} />
        <JsEnableScript />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
