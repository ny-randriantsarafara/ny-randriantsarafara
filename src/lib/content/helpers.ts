import type {
  AboutSection,
  ContactSection,
  HeroSection,
  HowIWorkSection,
  PageContent,
  ProjectsSection,
  ProofSection,
  Section,
  SectionType,
  SkillsSection,
} from '@/types';

export function isSectionType<T extends Section>(section: Section, type: T['type']): section is T {
  return section.type === type;
}

export function extractSection<T extends Section>(
  content: PageContent,
  type: SectionType
): T | undefined {
  return content.sections.find((s) => s.type === type) as T | undefined;
}

export function extractSections<T extends Section>(content: PageContent, type: SectionType): T[] {
  return content.sections.filter((s) => s.type === type) as T[];
}

export const extractHeroSection = (content: PageContent): HeroSection | undefined =>
  extractSection<HeroSection>(content, 'hero');

export const extractProofSection = (content: PageContent): ProofSection | undefined =>
  extractSection<ProofSection>(content, 'proof');

export const extractProjectsSection = (content: PageContent): ProjectsSection | undefined =>
  extractSection<ProjectsSection>(content, 'projects');

export const extractSkillsSection = (content: PageContent): SkillsSection | undefined =>
  extractSection<SkillsSection>(content, 'skills');

export const extractHowIWorkSection = (content: PageContent): HowIWorkSection | undefined =>
  extractSection<HowIWorkSection>(content, 'how-i-work');

export const extractAboutSection = (content: PageContent): AboutSection | undefined =>
  extractSection<AboutSection>(content, 'about');

export const extractContactSection = (content: PageContent): ContactSection | undefined =>
  extractSection<ContactSection>(content, 'contact');
