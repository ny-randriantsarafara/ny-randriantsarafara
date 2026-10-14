import { ConversationalShell } from '@/components/chat/conversational-shell.tsx';
import { AmbientBackground, Footer, Navbar } from '@/components/layout';
import { LanguageSuggestion } from '@/components/page/language-suggestion.tsx';
import { QuickViewSections } from '@/components/page/quick-view-sections.tsx';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';
import { buildPageJsonLdScript } from '@/lib/seo/structured-data.ts';

import type { Locale } from '@portfolio/content';

interface PortfolioPageProps {
  locale: Locale;
}

export function PortfolioPage({ locale }: PortfolioPageProps) {
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const sections = buildPageSections(publication.content, locale, dictionary);
  const welcome = buildWelcomeData(publication.content, locale);
  const jsonLd = buildPageJsonLdScript(publication, locale, getSiteUrl());

  return (
    <>
      <script type="application/ld+json">{jsonLd}</script>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        {dictionary.skipLink}
      </a>

      {locale === 'en' && <LanguageSuggestion linkLabel={dictionary.language.suggestionLink} />}

      <AmbientBackground />

      <ConversationalShell
        locale={locale}
        dictionary={dictionary}
        welcome={welcome}
        footer={sections.footer}
        quickViewSections={sections}
        onOpenContact={undefined}
      />

      <div className="quick-view-content">
        <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
          <QuickViewSections sections={sections} />
        </main>
        <Footer data={sections.footer} />
        <Navbar locale={locale} dictionary={dictionary} />
      </div>
    </>
  );
}
