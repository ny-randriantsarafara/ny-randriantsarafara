export interface Project {
  title: string;
  description: string;
  tech: string[];
  note?: string;
}

export interface ProjectsSectionData {
  title: string;
  subtitle: string;
  projects: Project[];
}

export interface ProjectsSection {
  type: 'projects';
  id: string;
  data: ProjectsSectionData;
}
