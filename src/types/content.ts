import type {
  AboutSection,
  ContactSection,
  ExperienceSection,
  HeroSection,
  InitiativesSection,
  ProjectsSection,
} from './sections';

export type SectionType = 'hero' | 'projects' | 'about' | 'contact' | 'experience' | 'initiatives';

export type Section =
  | HeroSection
  | ProjectsSection
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
