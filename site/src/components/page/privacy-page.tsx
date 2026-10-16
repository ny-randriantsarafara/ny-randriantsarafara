import Link from 'next/link';

import { LanguageLink } from '@/components/page/language-link.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { localePath, otherLocale, privacyPath } from '@/lib/i18n/locales.ts';
import { privacyDocument } from '@/lib/privacy/privacy-content.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPrivacyMetadata } from '@/lib/seo/privacy-metadata.ts';

import type { Locale } from '@portfolio/content';

type PrivacyPageProps = {
  locale: Locale;
};

export function buildPrivacyPageMetadata(locale: Locale) {
  const publication = readPublication();
  const document = privacyDocument(locale, {
    name: publication.content.profile.name,
    email: publication.content.profile.email,
  });
  return buildPrivacyMetadata(locale, document.title, document.description);
}

export function PrivacyPage({ locale }: PrivacyPageProps) {
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const document = privacyDocument(locale, {
    name: publication.content.profile.name,
    email: publication.content.profile.email,
  });
  const alternate = otherLocale(locale);

  return (
    <main
      id="main"
      className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16 sm:px-8"
    >
      <nav className="text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href={localePath(locale)} className="underline decoration-dotted">
          {dictionary.privacy.backToSite}
        </Link>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <LanguageLink
          locale={alternate}
          href={privacyPath(alternate)}
          hrefLang={alternate}
          lang={alternate}
        >
          {dictionary.privacy.alternateLanguage}
        </LanguageLink>
      </nav>
      <header>
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {document.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {document.description}
        </p>
      </header>
      {document.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="mt-3 text-sm leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <p className="text-sm" style={{ color: 'var(--text-dimmed)' }}>
        {document.rightsContact}
      </p>
    </main>
  );
}
