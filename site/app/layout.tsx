import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers';
import { contentService } from '@/lib/content';
import { getSiteUrl, parseTitleParts } from '@/lib/seo';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await contentService.getPageContent();
  const siteUrl = getSiteUrl();
  const { name } = parseTitleParts(content.metadata.title);

  return {
    metadataBase: siteUrl,
    title: content.metadata.title,
    description: content.metadata.description,
    themeColor: content.metadata.themeColor,
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
