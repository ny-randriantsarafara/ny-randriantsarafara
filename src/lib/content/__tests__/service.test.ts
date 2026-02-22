import { describe, expect, it, vi } from 'vitest';

import { DatabaseContentProvider } from '@/lib/content/providers/database';

import type { PageContent } from '@/types';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}));

const contentFixture: PageContent = {
  metadata: {
    title: 'Ny Hasinavalona - Senior Software Engineer',
    description: 'Senior Software Engineer crafting scalable cloud systems.',
    themeColor: '#0b0b0d',
  },
  sections: [],
};

describe('DatabaseContentProvider', () => {
  it('returns page content from the database', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([{ key: 'metadata', data: contentFixture.metadata }]),
    });

    const provider = new DatabaseContentProvider();
    const content = await provider.getPageContent();

    expect(content.metadata).toEqual(contentFixture.metadata);
    expect(content.sections).toEqual([]);
  });

  it('returns null for missing sections', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const provider = new DatabaseContentProvider();
    const section = await provider.getSectionByType('hero');

    expect(section).toBeNull();
  });
});
