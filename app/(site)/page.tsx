import { Header, Section } from '@/components/layout';
import { RevealProvider } from '@/components/reveal-provider';
import { About, Contact, Hero, HowIWork, Projects, Proof, Skills } from '@/components/sections';
import {
  contentService,
  extractAboutSection,
  extractContactSection,
  extractHeroSection,
  extractHowIWorkSection,
  extractProjectsSection,
  extractProofSection,
  extractSkillsSection,
} from '@/lib/content';
import { getSiteUrl, parseTitleParts } from '@/lib/seo';

export default async function Home() {
  const content = await contentService.getPageContent();

  const hero = extractHeroSection(content);
  const proof = extractProofSection(content);
  const projects = extractProjectsSection(content);
  const skills = extractSkillsSection(content);
  const howIWork = extractHowIWorkSection(content);
  const about = extractAboutSection(content);
  const contact = extractContactSection(content);
  const { name, role } = parseTitleParts(content.metadata.title);
  const siteUrl = getSiteUrl().toString().replace(/\/$/, '');
  const primaryRole = role ?? 'Senior Software Engineer';
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      jobTitle: primaryRole,
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

  return (
    <RevealProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="relative">
        {hero && <Hero data={hero.data} />}

        {proof && (
          <Section id="proof">
            <Proof data={proof.data} />
          </Section>
        )}

        {projects && (
          <Section id="projects" variant="sand">
            <Projects data={projects.data} />
          </Section>
        )}

        {skills && (
          <Section id="skills">
            <Skills data={skills.data} />
          </Section>
        )}

        {howIWork && (
          <Section id="how" variant="sand">
            <HowIWork data={howIWork.data} />
          </Section>
        )}

        {about && (
          <Section id="about">
            <About data={about.data} />
          </Section>
        )}

        {contact && (
          <Section id="contact" variant="dark">
            <Contact data={contact.data} />
          </Section>
        )}
      </main>
    </RevealProvider>
  );
}
