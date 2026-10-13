import { StaticContentProvider } from './providers';

import type { ContentConfig, ContentProvider } from './types';
import type { PageContent, Section, SectionType } from '@/types';

class ContentService implements ContentProvider {
  private provider: ContentProvider;

  constructor(provider?: ContentProvider) {
    this.provider = provider ?? new StaticContentProvider();
  }

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

export const contentService = new ContentService();

export function createContentService(
  provider?: ContentProvider,
  _config?: ContentConfig
): ContentService {
  return new ContentService(provider);
}
