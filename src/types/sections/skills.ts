export interface Skill {
  title: string;
  description: string;
  details: string;
}

export interface SkillsSectionData {
  title: string;
  subtitle: string;
  skills: Skill[];
}

export interface SkillsSection {
  type: 'skills';
  id: string;
  data: SkillsSectionData;
}
