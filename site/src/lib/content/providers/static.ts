import { promises as fs } from 'fs';
import path from 'path';

import type { ContentConfig, ContentProvider } from '../types';
import type { PageContent, Section, SectionType } from '@/types';

const DEFAULT_CONFIG: ContentConfig = {
  cache: true,
  cacheTtl: Infinity,
};

export class StaticContentProvider implements ContentProvider {
  private config: ContentConfig;
  private cachedContent: PageContent | null = null;
  private cacheTimestamp: number = 0;

  constructor(config: ContentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async loadContent(): Promise<PageContent> {
    const now = Date.now();
    const ttlMs = (this.config.cacheTtl ?? Infinity) * 1000;

    if (this.config.cache && this.cachedContent && now - this.cacheTimestamp < ttlMs) {
      return this.cachedContent;
    }

    const filePath = path.join(process.cwd(), 'public', 'data', 'content.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const content = JSON.parse(fileContent) as PageContent;

    if (this.config.cache) {
      this.cachedContent = content;
      this.cacheTimestamp = now;
    }

    return content;
  }

  async getPageContent(): Promise<PageContent> {
    return this.loadContent();
  }

  async getSectionById<T extends Section>(id: string): Promise<T | null> {
    const content = await this.loadContent();
    const section = content.sections.find((s) => s.id === id);
    return (section as T) ?? null;
  }

  async getSectionByType<T extends Section>(type: SectionType): Promise<T | null> {
    const content = await this.loadContent();
    const section = content.sections.find((s) => s.type === type);
    return (section as T) ?? null;
  }

  async getSectionsByType<T extends Section>(type: SectionType): Promise<T[]> {
    const content = await this.loadContent();
    return content.sections.filter((s) => s.type === type) as T[];
  }
}
