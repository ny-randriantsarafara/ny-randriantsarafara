import Link from 'next/link';

import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

import './globals.css';

export default function GlobalNotFound() {
  const english = dictionaryFor('en');
  const french = dictionaryFor('fr');

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold">{english.notFound.title}</h1>
        <p>{english.notFound.description}</p>
        <p lang="fr">{french.notFound.frenchLine}</p>
        <div className="flex gap-4 text-sm">
          <Link href="/">{english.notFound.homeLink}</Link>
          <Link href="/fr" hrefLang="fr" lang="fr">
            {english.notFound.frenchLink}
          </Link>
        </div>
      </body>
    </html>
  );
}
