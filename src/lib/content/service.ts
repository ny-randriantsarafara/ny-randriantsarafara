import { StaticContentProvider } from './providers';

import type { ContentConfig, ContentProvider } from './types';
import type { PageContent, Section, SectionType } from '@/types';

/**
 * Content service - main entry point for fetching content
 *
 * Uses dependency injection pattern - provider can be swapped without changing consumer code.
 * To switch to a CMS, create a new provider (e.g., SanityContentProvider) and pass it here.
 */
class ContentService implements ContentProvider {
  private provider: ContentProvider;

  constructor(provider?: ContentProvider) {
    // Default to static provider - swap this when integrating a CMS
    this.provider = provider ?? new StaticContentProvider();
  }

  /**
   * Replace the current provider (useful for testing or runtime switching)
   */
  setProvider(provider: ContentProvider): void {
    this.provider = provider;
  }

  async getPageContent(): Promise<PageContent> {
    return this.provider.getPageContent();
  }

  async getSectionById<T extends Section>(id: string): Promise<T | null> {
    return this.provider.getSectionById<T>(id);
  }

  async getSectionByType<T extends Section>(type: SectionType): Promise<T | null> {
    return this.provider.getSectionByType<T>(type);
  }

  async getSectionsByType<T extends Section>(type: SectionType): Promise<T[]> {
    return this.provider.getSectionsByType<T>(type);
  }
}

// Singleton instance - import this in your components
export const contentService = new ContentService();

/**
 * Factory function to create a content service with custom provider
 * Useful for testing or when you need multiple instances
 */
export function createContentService(
  provider?: ContentProvider,
  _config?: ContentConfig
): ContentService {
  return new ContentService(provider);
}
