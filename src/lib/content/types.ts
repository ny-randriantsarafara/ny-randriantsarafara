import type { PageContent, Section, SectionType } from '@/types';

export interface ContentProvider {
  getPageContent(): Promise<PageContent>;
  getSectionById<T extends Section>(id: string): Promise<T | null>;
  getSectionByType<T extends Section>(type: SectionType): Promise<T | null>;
  getSectionsByType<T extends Section>(type: SectionType): Promise<T[]>;
}

export interface ContentConfig {
  cache?: boolean;
  cacheTtl?: number;
  revalidate?: number | false;
}
