import { Section } from '@/components/layout';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';

import type { PageSections } from '@/types/page-sections.ts';

type QuickViewSectionsProps = {
  sections: PageSections;
};

export function QuickViewSections({ sections }: QuickViewSectionsProps) {
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
        <Contact data={sections.contact} />
      </Section>
    </>
  );
}
