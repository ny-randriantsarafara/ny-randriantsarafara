import type { Link } from '../common';

export interface ContactSectionData {
  title: string;
  description: string;
  links: Link[];
  footer: {
    copyright: string;
    tagline: string;
  };
}

export interface ContactSection {
  type: 'contact';
  id: string;
  data: ContactSectionData;
}
