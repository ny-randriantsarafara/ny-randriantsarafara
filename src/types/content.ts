import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  HowIWorkSection,
  InitiativesSection,
  ProjectsSection,
  ProofSection,
  SkillsSection,
} from './sections';

export type SectionType =
  | 'hero'
  | 'proof'
  | 'projects'
  | 'skills'
  | 'how-i-work'
  | 'about'
  | 'contact'
  | 'experience'
  | 'initiatives';

export type Section =
  | HeroSection
  | ProofSection
  | ProjectsSection
  | SkillsSection
  | HowIWorkSection
  | AboutSection
  | ContactSection
  | ExperienceSection
  | InitiativesSection;

export interface PageMetadata {
  title: string;
  description: string;
  themeColor?: string;
}

export interface PageContent {
  sections: Section[];
  metadata: PageMetadata;
}
