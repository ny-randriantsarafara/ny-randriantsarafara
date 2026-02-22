import { DatabaseContentProvider } from './providers';

import type { ContentProvider } from './types';
import type { NavigationData, PageContent, Section, SectionType, SiteSettingsData } from '@/types';

class ContentService implements ContentProvider {
  private provider: DatabaseContentProvider;

  constructor(provider?: DatabaseContentProvider) {
    this.provider = provider ?? new DatabaseContentProvider();
  }

  setProvider(provider: DatabaseContentProvider): void {
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

  async getNavigation(): Promise<NavigationData | null> {
    return this.provider.getNavigation();
  }

  async getSiteSettings(): Promise<SiteSettingsData | null> {
    return this.provider.getSiteSettings();
  }

  async getContentByKey(key: string): Promise<unknown> {
    return this.provider.getContentByKey(key);
  }

  async updateContentByKey(key: string, data: unknown): Promise<void> {
    return this.provider.updateContentByKey(key, data);
  }
}

export const contentService = new ContentService();
