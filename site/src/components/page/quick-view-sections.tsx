import { Section } from '@/components/layout';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';

import type { PageSections } from '@/types/page-sections.ts';
import type { Locale } from '@portfolio/content';

type QuickViewSectionsProps = {
  locale: Locale;
  sections: PageSections;
};

export function QuickViewSections({ locale, sections }: QuickViewSectionsProps) {
  return (
    <>
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
        <Contact locale={locale} data={sections.contact} />
      </Section>
    </>
  );
}
