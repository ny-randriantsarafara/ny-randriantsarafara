import { readItems, readSingleton } from '@directus/sdk';
import { initialContent } from '@portfolio/cms-provision/seed';
import { describe, expect, it } from 'vitest';

import { adminClient } from './support/clients.ts';

describe('initial content', () => {
  it('loads every initial experience, project and skill', async () => {
    const [experiences, projects, skills] = await Promise.all([
      adminClient.request(readItems('experiences', { fields: ['slug'], limit: -1 })),
      adminClient.request(readItems('projects', { fields: ['slug'], limit: -1 })),
      adminClient.request(readItems('skills', { fields: ['slug'], limit: -1 })),
    ]);

    expect(experiences.map((item) => item.slug)).toEqual(
      expect.arrayContaining(initialContent.experiences.map((item) => item.slug))
    );
    expect(projects.map((item) => item.slug)).toEqual(
      expect.arrayContaining(initialContent.projects.map((item) => item.slug))
    );
    expect(skills.map((item) => item.slug)).toEqual(
      expect.arrayContaining(initialContent.skills.map((item) => item.slug))
    );
  });

  it('fills the profile', async () => {
    const profile = await adminClient.request(readSingleton('profile', { fields: ['name'] }));

    expect(profile.name).toBe(initialContent.profile.name);
  });
});
