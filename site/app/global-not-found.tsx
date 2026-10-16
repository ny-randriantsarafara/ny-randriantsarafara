import Link from 'next/link';

import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

import './globals.css';

export default function GlobalNotFound() {
  const english = dictionaryFor('en');
  const french = dictionaryFor('fr');

  return (
    <html lang="en-US">
      <body className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-semibold">{english.notFound.title}</h1>
          <p>{english.notFound.description}</p>
          <Link href="/" className="text-sm underline">
            {english.notFound.homeLink}
          </Link>
        </div>
        <div lang="fr" className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-semibold">{french.notFound.title}</h2>
          <p>{french.notFound.description}</p>
          <Link href="/fr" hrefLang="fr" className="text-sm underline">
            {french.notFound.homeLink}
          </Link>
        </div>
      </body>
    </html>
  );
}
