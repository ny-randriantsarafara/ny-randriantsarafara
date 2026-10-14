import { ConversationalShell } from '@/components/chat/conversational-shell.tsx';
import { AmbientBackground, Footer, Navbar } from '@/components/layout';
import { LanguageSuggestion } from '@/components/page/language-suggestion.tsx';
import { PortfolioPageShell } from '@/components/page/portfolio-page-shell.tsx';
import { QuickViewSections } from '@/components/page/quick-view-sections.tsx';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { privacyPath } from '@/lib/i18n/locales.ts';
import { readProfilePhotoManifest } from '@/lib/publication/profile-photo-manifest.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';
import { getSiteUrl } from '@/lib/seo/site-url.ts';
import { buildPageJsonLdScript } from '@/lib/seo/structured-data.ts';
import { PageViewTracker } from '@/lib/tracking/page-view-tracker.tsx';

import type { Locale } from '@portfolio/content';

interface PortfolioPageProps {
  locale: Locale;
}

export function PortfolioPage({ locale }: PortfolioPageProps) {
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const sections = buildPageSections(publication.content, locale, dictionary);
  const photoManifest = readProfilePhotoManifest();
  const welcome = buildWelcomeData(publication.content, locale, photoManifest);
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
      <PageViewTracker locale={locale} />

      <PortfolioPageShell
        chat={
          <ConversationalShell
            key={locale}
            locale={locale}
            dictionary={dictionary}
            welcome={welcome}
            ownerEmail={publication.content.profile.email}
          />
        }
        quickView={
          <div className="quick-view-content">
            <main
              id="main"
              className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32"
            >
              <QuickViewSections sections={sections} />
            </main>
            <Footer
              data={sections.footer}
              privacyHref={privacyPath(locale)}
              privacyLabel={dictionary.footer.privacy}
            />
            <Navbar locale={locale} dictionary={dictionary} />
          </div>
        }
      />
    </>
  );
}
