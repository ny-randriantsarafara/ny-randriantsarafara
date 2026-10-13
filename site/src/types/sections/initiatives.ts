import type { IconName } from '@/lib/icons';

export interface InitiativeItem {
  icon: IconName;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface InitiativesSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  description: string;
  items: InitiativeItem[];
}

export interface InitiativesSection {
  type: 'initiatives';
  id: string;
  data: InitiativesSectionData;
}
