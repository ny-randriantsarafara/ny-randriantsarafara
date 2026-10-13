import type { IconName as ContentIconName } from '@portfolio/content';

export type Link = {
  label: string;
  href: string;
};

export type HeroSnapshotStat = {
  value: string;
  label: string;
};

export type HeroSectionData = {
  tagline: string;
  availabilityBadge: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  subheadline: string;
  primaryCta: Link;
  secondaryCta: Link;
  email: string;
  focusLabel: string;
  stackLabel: string;
  snapshot: {
    role: string;
    location: string;
    stats: HeroSnapshotStat[];
    stack: string[];
  };
};

export type AboutFeature = {
  icon: ContentIconName;
  title: string;
  description: string;
};

export type AboutSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  journeyTitle: string;
  journeyParagraphs: string[];
  stat: HeroSnapshotStat | null;
  coreStackTitle: string;
  coreStack: string[];
  features: AboutFeature[];
};

export type ProjectItem = {
  title: string;
  role: string;
  year: string;
  company: string;
  description: string;
  tech: string[];
};

export type ProjectsSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  footnote: string;
  items: ProjectItem[];
};

export type ExperienceItem = {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  tech: string[];
};

export type ExperienceSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
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

export type ContactDetail = {
  label: string;
  value: string;
};

export type ContactSectionData = {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  ctaLabel: string;
  channels: ContactChannel[];
  details: ContactDetail[];
};

export type FooterSectionData = {
  copyright: string;
  tagline: string;
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
