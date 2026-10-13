import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export function generateMetadata(): Metadata {
  const publication = readPublication();
  const siteUrl = getSiteUrl();
  const profile = publication.content.profile;
  const title = publication.content.siteSettings.title.en;
  const description = publication.content.siteSettings.description.en;

  return {
    metadataBase: siteUrl,
    title,
    description,
    authors: [{ name: profile.name }],
    creator: profile.name,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      title,
      description,
      siteName: profile.name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateViewport(): Viewport {
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
      { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
