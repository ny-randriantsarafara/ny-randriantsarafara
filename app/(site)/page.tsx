import { AmbientBackground, Footer, Navbar, Section } from '@/components/layout';
import { About, Contact, Experience, Hero, Initiatives, Projects } from '@/components/sections';
import {
  contentService,
  extractAboutSection,
  extractContactSection,
  extractExperienceSection,
  extractHeroSection,
  extractInitiativesSection,
  extractProjectsSection,
} from '@/lib/content';
import { getSiteUrl, parseTitleParts } from '@/lib/seo';

export default async function Home() {
  const content = await contentService.getPageContent();

  const hero = extractHeroSection(content);
  const about = extractAboutSection(content);
  const projects = extractProjectsSection(content);
  const experience = extractExperienceSection(content);
  const initiatives = extractInitiativesSection(content);
  const contact = extractContactSection(content);

  const { name } = parseTitleParts(content.metadata.title);
  const siteUrl = getSiteUrl().toString().replace(/\/$/, '');

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      jobTitle: hero?.data.snapshot.role,
      url: siteUrl,
      email: hero?.data.email,
      description: content.metadata.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name,
      url: siteUrl,
      description: content.metadata.description,
    },
  ];
  const [primaryDetail] = contact?.data.details ?? [];

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:px-4 focus:py-2"
        style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
      >
        Skip to content
      </a>

      <AmbientBackground />

      <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
        {hero && <Hero data={hero.data} />}

        {about && (
          <Section id="about-wrapper">
            <About data={about.data} />
          </Section>
        )}

        {projects && (
          <Section id="projects-wrapper">
            <Projects data={projects.data} />
          </Section>
        )}

        {experience && (
          <Section id="experience-wrapper">
            <Experience data={experience.data} />
          </Section>
        )}

        {initiatives && (
          <Section id="initiatives-wrapper">
            <Initiatives data={initiatives.data} />
          </Section>
        )}

        {contact && (
          <Section id="contact-wrapper">
            <Contact data={contact.data} />
          </Section>
        )}
      </main>

      {contact && <Footer data={contact.data.footer} location={primaryDetail?.value ?? ''} />}

      <Navbar />
    </>
  );
}
