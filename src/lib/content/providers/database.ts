import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { siteContent } from '@/lib/db/schema';

import type { ContentProvider } from '../types';
import type {
  NavigationData,
  PageContent,
  PageMetadata,
  Section,
  SectionType,
  SiteSettingsData,
} from '@/types';

const SECTION_KEYS: SectionType[] = [
  'hero',
  'proof',
  'projects',
  'skills',
  'how-i-work',
  'about',
  'contact',
];

export class DatabaseContentProvider implements ContentProvider {
  async getPageContent(): Promise<PageContent> {
    const rows = await getDb().select().from(siteContent);

    const metadataRow = rows.find((r) => r.key === 'metadata');
    const metadata = (metadataRow?.data as PageMetadata) ?? {
      title: '',
      description: '',
    };

    const sections = rows
      .filter((r) => SECTION_KEYS.includes(r.key as SectionType))
      .map((r) => r.data as Section);

    return { metadata, sections };
  }

  async getSectionById<T extends Section>(id: string): Promise<T | null> {
    const content = await this.getPageContent();
    const section = content.sections.find((s) => s.id === id);
    return (section as T) ?? null;
  }

  async getSectionByType<T extends Section>(type: SectionType): Promise<T | null> {
    const row = await getDb().select().from(siteContent).where(eq(siteContent.key, type)).limit(1);

    if (row.length === 0) {
      return null;
    }

    return row[0].data as T;
  }

  async getSectionsByType<T extends Section>(type: SectionType): Promise<T[]> {
    const row = await getDb().select().from(siteContent).where(eq(siteContent.key, type));
    return row.map((r) => r.data as T);
  }

  async getNavigation(): Promise<NavigationData | null> {
    const row = await getDb()
      .select()
      .from(siteContent)
      .where(eq(siteContent.key, 'navigation'))
      .limit(1);

    if (row.length === 0) {
      return null;
    }

    return row[0].data as NavigationData;
  }

  async getSiteSettings(): Promise<SiteSettingsData | null> {
    const row = await getDb()
      .select()
      .from(siteContent)
      .where(eq(siteContent.key, 'site-settings'))
      .limit(1);

    if (row.length === 0) {
      return null;
    }

    return row[0].data as SiteSettingsData;
  }

  async getContentByKey(key: string): Promise<unknown> {
    const row = await getDb().select().from(siteContent).where(eq(siteContent.key, key)).limit(1);

    if (row.length === 0) {
      return null;
    }

    return row[0].data;
  }

  async updateContentByKey(key: string, data: unknown): Promise<void> {
    await getDb()
      .update(siteContent)
      .set({ data: data as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(siteContent.key, key));
  }
}
