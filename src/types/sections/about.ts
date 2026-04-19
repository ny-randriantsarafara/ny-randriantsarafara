import type { IconName } from '@/lib/icons';

export interface AboutFeature {
  icon: IconName;
  title: string;
  description: string;
}

export interface AboutCoreStack {
  title: string;
  items: string[];
}

export interface AboutJourney {
  title: string;
  paragraphs: string[];
}

export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  journey: AboutJourney;
  stat: AboutStat;
  coreStack: AboutCoreStack;
  features: AboutFeature[];
}

export interface AboutSection {
  type: 'about';
  id: string;
  data: AboutSectionData;
}
