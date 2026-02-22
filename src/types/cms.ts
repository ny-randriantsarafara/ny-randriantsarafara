import type { Link } from './common';

export interface NavigationData {
  links: Link[];
}

export interface SiteLabels {
  trustedBy: string;
  quickDetails: string;
  scrollBreathVerify: string;
  practiceHeading: string;
  techLabel: string;
  philosophyLine1: string;
  philosophyLine2: string;
  skipToContent: string;
  locationText: string;
}

export interface SiteSettingsData {
  brandName: string;
  roleText: string;
  ctaText: string;
  labels: SiteLabels;
}

export type ContentKey =
  | 'metadata'
  | 'hero'
  | 'proof'
  | 'projects'
  | 'skills'
  | 'how-i-work'
  | 'about'
  | 'contact'
  | 'navigation'
  | 'site-settings';
