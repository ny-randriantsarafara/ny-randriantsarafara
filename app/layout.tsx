import { Geist, Geist_Mono } from 'next/font/google';

import { contentService, extractHeroSection } from '@/lib/content';
import { getSiteUrl, parseTitleParts } from '@/lib/seo';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await contentService.getPageContent();
  const hero = extractHeroSection(content);
  const siteUrl = getSiteUrl();
  const { name } = parseTitleParts(content.metadata.title);

  const keywords =
    hero?.data.tagline
      ?.split('·')
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  return {
    metadataBase: siteUrl,
    title: content.metadata.title,
    description: content.metadata.description,
    themeColor: content.metadata.themeColor,
    keywords,
    authors: [{ name }],
    creator: name,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      title: content.metadata.title,
      description: content.metadata.description,
      siteName: name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title: content.metadata.title,
      description: content.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
