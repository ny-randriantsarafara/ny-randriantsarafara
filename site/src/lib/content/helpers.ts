import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  InitiativesSection,
  PageContent,
  ProjectsSection,
  Section,
  SectionType,
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

export const extractProjectsSection = (content: PageContent): ProjectsSection | undefined =>
  extractSection<ProjectsSection>(content, 'projects');

export const extractAboutSection = (content: PageContent): AboutSection | undefined =>
  extractSection<AboutSection>(content, 'about');

export const extractContactSection = (content: PageContent): ContactSection | undefined =>
  extractSection<ContactSection>(content, 'contact');

export const extractExperienceSection = (content: PageContent): ExperienceSection | undefined =>
  extractSection<ExperienceSection>(content, 'experience');

export const extractInitiativesSection = (content: PageContent): InitiativesSection | undefined =>
  extractSection<InitiativesSection>(content, 'initiatives');
