import type {
  HeroSection,
  ProofSection,
  ProjectsSection,
  SkillsSection,
  HowIWorkSection,
  AboutSection,
  ContactSection,
} from './sections';

export type SectionType =
  | 'hero'
  | 'proof'
  | 'projects'
  | 'skills'
  | 'how-i-work'
  | 'about'
  | 'contact';

export type Section =
  | HeroSection
  | ProofSection
  | ProjectsSection
  | SkillsSection
  | HowIWorkSection
  | AboutSection
  | ContactSection;

export interface PageMetadata {
  title: string;
  description: string;
  themeColor?: string;
}

export interface PageContent {
  sections: Section[];
  metadata: PageMetadata;
}
