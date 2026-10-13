import { AmbientBackground, Footer, Navbar, Section } from '@/components/layout';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';

export default function Home() {
  const publication = readPublication();
  const dictionary = dictionaryFor('en');
  const sections = buildPageSections(publication.content, 'en', dictionary);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        {dictionary.skipLink}
      </a>

      <AmbientBackground />

      <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
        <Hero data={sections.hero} />

        <Section id="about-wrapper">
          <About data={sections.about} />
        </Section>

        <Section id="projects-wrapper">
          <Projects data={sections.projects} />
        </Section>

        <Section id="experience-wrapper">
          <Experience data={sections.experience} />
        </Section>

        <Section id="initiatives-wrapper">
          <Initiatives data={sections.initiatives} />
        </Section>

        <Section id="contact-wrapper">
          <Contact data={sections.contact} />
        </Section>
      </main>

      <Footer data={sections.footer} />
      <Navbar />
    </>
  );
}
