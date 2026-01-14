import type { PageContent, Section, SectionType } from '@/types';

/**
 * Content provider interface - implement this for each data source (static, CMS, etc.)
 */
export interface ContentProvider {
  /**
   * Fetch the full page content
   */
  getPageContent(): Promise<PageContent>;

  /**
   * Fetch a single section by its ID
   */
  getSectionById<T extends Section>(id: string): Promise<T | null>;

  /**
   * Fetch a single section by its type
   * Returns the first section matching the type
   */
  getSectionByType<T extends Section>(type: SectionType): Promise<T | null>;

  /**
   * Fetch all sections of a specific type
   */
  getSectionsByType<T extends Section>(type: SectionType): Promise<T[]>;
}

/**
 * Configuration for content fetching
 */
export interface ContentConfig {
  /**
   * Enable caching (useful for static provider, may be disabled for CMS with webhooks)
   */
  cache?: boolean;

  /**
   * Cache TTL in seconds (default: 60 for CMS, Infinity for static)
   */
  cacheTtl?: number;

  /**
   * Revalidate option for Next.js fetch
   */
  revalidate?: number | false;
}
