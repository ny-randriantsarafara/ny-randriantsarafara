import { describe, expect, it, vi } from 'vitest';

import { createContentService } from '@/lib/content/service';

import type { ContentProvider } from '@/lib/content/types';
import type { PageContent } from '@/types';

const contentFixture: PageContent = {
  metadata: {
    title: 'Ny Hasinavalona - Senior Software Engineer',
    description: 'Senior Software Engineer crafting scalable cloud systems.',
    themeColor: '#0b0b0d',
  },
  sections: [],
};

describe('ContentService', () => {
  it('delegates to the provider for page content', async () => {
    const provider: ContentProvider = {
      getPageContent: vi.fn().mockResolvedValue(contentFixture),
      getSectionById: vi.fn().mockResolvedValue(null),
      getSectionByType: vi.fn().mockResolvedValue(null),
      getSectionsByType: vi.fn().mockResolvedValue([]),
    };

    const service = createContentService(provider);
    const content = await service.getPageContent();

    expect(provider.getPageContent).toHaveBeenCalledOnce();
    expect(content).toEqual(contentFixture);
  });

  it('allows swapping providers on an instance', async () => {
    const provider: ContentProvider = {
      getPageContent: vi.fn().mockResolvedValue(contentFixture),
      getSectionById: vi.fn().mockResolvedValue(null),
      getSectionByType: vi.fn().mockResolvedValue(null),
      getSectionsByType: vi.fn().mockResolvedValue([]),
    };

    const service = createContentService();
    service.setProvider(provider);
    await service.getPageContent();

    expect(provider.getPageContent).toHaveBeenCalledOnce();
  });
});
