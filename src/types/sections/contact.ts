export type ContactChannelKind = 'email' | 'linkedin' | 'github';

export interface ContactChannel {
  kind: ContactChannelKind;
  label: string;
  href: string;
}

export interface ContactDetail {
  label: string;
  value: string;
}

export interface ContactFooter {
  copyright: string;
  tagline: string;
}

export interface ContactSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  channels: ContactChannel[];
  details: ContactDetail[];
  footer: ContactFooter;
}

export interface ContactSection {
  type: 'contact';
  id: string;
  data: ContactSectionData;
}
