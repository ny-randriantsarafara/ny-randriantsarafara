import type { IconName as ContentIconName } from '@portfolio/content';

export type Link = {
  label: string;
  href: string;
};

export type HeroFact = {
  label: string;
  value: string;
};

export type HeroSectionData = {
  headlinePrefix: string;
  headlineHighlight: string;
  paragraphs: string[];
  primaryCta: Link;
  askLabel: string;
  secondaryCta: Link;
  facts: HeroFact[];
};

export type AboutFeature = {
  icon: ContentIconName;
  title: string;
  description: string;
};

export type TechnologyRow = {
  usage: string;
  technologies: string[];
};

export type AboutSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  journeyParagraphs: string[];
  featuresTitle: string;
  features: AboutFeature[];
  technologiesTitle: string;
  usageHeader: string;
  technologiesHeader: string;
  technologies: TechnologyRow[];
};

export type ProjectItem = {
  title: string;
  role: string;
  year: string;
  company: string;
  description: string;
  caseStudy: string | null;
  followUpQuestion: string | null;
  tech: string[];
};

export type ProjectsSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  introduction: string;
  caseStudyLabel: string;
  items: ProjectItem[];
};

export type ExperienceItem = {
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
  bullets: string[];
  tech: string[];
};

export type ExperienceSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  technologiesLabel: string;
  items: ExperienceItem[];
};

export type InitiativeItem = {
  icon: ContentIconName;
  title: string;
  description: string;
  tags: string[];
};

export type InitiativesSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: InitiativeItem[];
};

export type ContactChannelKind = 'email' | 'linkedin' | 'github';

export type ContactChannel = {
  kind: ContactChannelKind;
  kindLabel: string;
  label: string;
  href: string;
};

export type ContactSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  channelsTitle: string;
  channels: ContactChannel[];
};

export type FooterSectionData = {
  copyright: string;
  location: string;
  backToTop: string;
};

export type PageSections = {
  hero: HeroSectionData;
  about: AboutSectionData;
  projects: ProjectsSectionData;
  experience: ExperienceSectionData;
  initiatives: InitiativesSectionData;
  contact: ContactSectionData;
  footer: FooterSectionData;
};
