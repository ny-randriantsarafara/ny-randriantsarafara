import type { Link } from '../common';

export interface HeroSnapshotStat {
  value: string;
  label: string;
}

export interface HeroSnapshot {
  role: string;
  location: string;
  stats: HeroSnapshotStat[];
  stack: string[];
}

export interface HeroSectionData {
  tagline: string;
  availabilityBadge: string;
  headlinePrefix: string;
  headlineHighlight: string;
  headlineSuffix: string;
  subheadline: string;
  primaryCta: Link;
  secondaryCta: Link;
  email: string;
  snapshot: HeroSnapshot;
}

export interface HeroSection {
  type: 'hero';
  id: string;
  data: HeroSectionData;
}
