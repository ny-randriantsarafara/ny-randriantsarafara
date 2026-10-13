export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  tech: string[];
}

export interface ExperienceSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: ExperienceItem[];
  earlierLine: string;
}

export interface ExperienceSection {
  type: 'experience';
  id: string;
  data: ExperienceSectionData;
}
