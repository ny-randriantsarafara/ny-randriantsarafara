export interface Project {
  title: string;
  role: string;
  year: string;
  company: string;
  description: string;
  tech: string[];
}

export interface ProjectsSectionData {
  eyebrow: string;
  headlinePrefix: string;
  headlineHighlight: string;
  items: Project[];
  footnote: string;
}

export interface ProjectsSection {
  type: 'projects';
  id: string;
  data: ProjectsSectionData;
}
