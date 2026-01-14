import type { Link, StatItem } from '../common';

export interface HeroSectionData {
  tagline: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  primaryCta: Link;
  secondaryCta: Link;
  email: string;
  trustedBy: string[];
  snapshot: {
    title: string;
    description: string;
    availability: string;
    stats: StatItem[];
    footer: string;
  };
}

export interface HeroSection {
  type: 'hero';
  id: string;
  data: HeroSectionData;
}
