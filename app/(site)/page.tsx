import { EditableSection } from '@/components/cms';
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

import type { SiteLabels } from '@/types';

const DEFAULT_LABELS: SiteLabels = {
  trustedBy: 'Trusted by teams at',
  quickDetails: 'Quick details',
  scrollBreathVerify: 'Scroll · breathe · verify',
  practiceHeading: 'What that looks like in practice',
  techLabel: 'Tech:',
  philosophyLine1: 'Good software is quiet.',
  philosophyLine2: "It doesn't wake you up at night.",
  skipToContent: 'Skip to content',
  locationText: 'Built between Madagascar and France.',
};

const DEFAULT_NAV = [
  { label: 'Proof', href: '#proof' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'How I work', href: '#how' },
  { label: 'Contact', href: '#contact' },
];

export default async function Home() {
  const [content, navigation, siteSettings] = await Promise.all([
    contentService.getPageContent(),
    contentService.getNavigation(),
    contentService.getSiteSettings(),
  ]);

  const hero = extractHeroSection(content);
  const proof = extractProofSection(content);
  const projects = extractProjectsSection(content);
  const skills = extractSkillsSection(content);
  const howIWork = extractHowIWorkSection(content);
  const about = extractAboutSection(content);
  const contact = extractContactSection(content);

  const navLinks = navigation?.links ?? DEFAULT_NAV;
  const brandName = siteSettings?.brandName ?? 'Ny Hasinavalona';
  const roleText = siteSettings?.roleText ?? 'Senior Software Engineer';
  const ctaText = siteSettings?.ctaText ?? "Let's talk";
  const labels = siteSettings?.labels ?? DEFAULT_LABELS;

  const { name, role } = parseTitleParts(content.metadata.title);
  const siteUrl = getSiteUrl().toString().replace(/\/$/, '');
  const primaryRole = role ?? roleText;
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
        {labels.skipToContent}
      </a>

      <EditableSection sectionKey="navigation" currentData={navigation}>
        <Header navLinks={navLinks} brandName={brandName} roleText={roleText} ctaText={ctaText} />
      </EditableSection>

      <main id="main" className="relative">
        {hero && (
          <EditableSection sectionKey="hero" currentData={hero}>
            <Hero data={hero.data} labels={{ trustedBy: labels.trustedBy }} />
          </EditableSection>
        )}

        {proof && (
          <EditableSection sectionKey="proof" currentData={proof}>
            <Section id="proof">
              <Proof
                data={proof.data}
                labels={{
                  scrollBreathVerify: labels.scrollBreathVerify,
                  practiceHeading: labels.practiceHeading,
                }}
              />
            </Section>
          </EditableSection>
        )}

        {projects && (
          <EditableSection sectionKey="projects" currentData={projects}>
            <Section id="projects" variant="sand">
              <Projects data={projects.data} labels={{ techLabel: labels.techLabel }} />
            </Section>
          </EditableSection>
        )}

        {skills && (
          <EditableSection sectionKey="skills" currentData={skills}>
            <Section id="skills">
              <Skills data={skills.data} />
            </Section>
          </EditableSection>
        )}

        {howIWork && (
          <EditableSection sectionKey="how-i-work" currentData={howIWork}>
            <Section id="how" variant="sand">
              <HowIWork
                data={howIWork.data}
                labels={{
                  philosophyLine1: labels.philosophyLine1,
                  philosophyLine2: labels.philosophyLine2,
                }}
              />
            </Section>
          </EditableSection>
        )}

        {about && (
          <EditableSection sectionKey="about" currentData={about}>
            <Section id="about">
              <About
                data={about.data}
                labels={{
                  quickDetails: labels.quickDetails,
                  locationText: labels.locationText,
                }}
              />
            </Section>
          </EditableSection>
        )}

        {contact && (
          <EditableSection sectionKey="contact" currentData={contact}>
            <Section id="contact" variant="dark">
              <Contact data={contact.data} />
            </Section>
          </EditableSection>
        )}
      </main>

      <EditableSection sectionKey="metadata" currentData={content.metadata}>
        <span />
      </EditableSection>

      <EditableSection sectionKey="site-settings" currentData={siteSettings}>
        <span />
      </EditableSection>
    </RevealProvider>
  );
}
