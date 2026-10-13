import { describe, expect, it } from 'vitest';

import { formatChangeOverview, hasChanges, summarizeChanges } from './changes.ts';
import {
  contentFixture,
  eurosportProject,
  itrasExperience,
  profileFixture,
  visaProject,
  warnerExperience,
} from './testing/fixture.ts';

describe('summarizeChanges', () => {
  it('lists every item as added for the first publication', () => {
    const summary = summarizeChanges(null, contentFixture);

    expect(summary.firstPublication).toBe(true);
    expect(summary.collections.experiences.added).toEqual(['warner-bros-discovery', 'itras-group']);
    expect(hasChanges(summary)).toBe(true);
  });

  it('reports added, removed and changed items with their fields', () => {
    const next = {
      ...contentFixture,
      experiences: [
        {
          ...warnerExperience,
          summary: { en: 'New.', fr: 'Nouveau.' },
          skillSlugs: ['typescript'],
        },
      ],
      projects: [eurosportProject, visaProject, { ...visaProject, slug: 'maestro' }],
    };

    const summary = summarizeChanges(contentFixture, next);

    expect(summary.collections.experiences).toEqual({
      added: [],
      removed: ['itras-group'],
      changed: [{ slug: 'warner-bros-discovery', fields: ['skillSlugs', 'summary'] }],
      reordered: false,
    });
    expect(summary.collections.projects.added).toEqual(['maestro']);
  });

  it('detects a new order of the same items', () => {
    const next = { ...contentFixture, experiences: [itrasExperience, warnerExperience] };

    expect(summarizeChanges(contentFixture, next).collections.experiences.reordered).toBe(true);
  });

  it('reports changed singleton fields', () => {
    const next = {
      ...contentFixture,
      profile: { ...profileFixture, headline: { en: 'Architect', fr: 'Architecte' } },
    };

    expect(summarizeChanges(contentFixture, next).singletons.profile).toEqual(['headline']);
  });

  it('finds no change between identical contents', () => {
    expect(hasChanges(summarizeChanges(contentFixture, contentFixture))).toBe(false);
  });
});

describe('formatChangeOverview', () => {
  it('describes a first publication with counts', () => {
    expect(formatChangeOverview(summarizeChanges(null, contentFixture))).toBe(
      [
        'First publication.',
        '',
        '- Capabilities: 2',
        '- Skills: 3',
        '- Experiences: 2',
        '- Projects: 2',
        '- Key figures: 2',
        '- Answers: 2',
      ].join('\n')
    );
  });

  it('lists each change on its own line', () => {
    const next = {
      ...contentFixture,
      experiences: [{ ...warnerExperience, summary: { en: 'New.', fr: 'Nouveau.' } }],
      profile: { ...profileFixture, headline: { en: 'Architect', fr: 'Architecte' } },
    };

    expect(formatChangeOverview(summarizeChanges(contentFixture, next))).toBe(
      [
        'Changes since the active publication:',
        '',
        '- Experiences: removed `itras-group`',
        '- Experiences: changed `warner-bros-discovery` (summary)',
        '- Profile: changed (headline)',
      ].join('\n')
    );
  });

  it('says when nothing changed', () => {
    expect(formatChangeOverview(summarizeChanges(contentFixture, contentFixture))).toBe(
      'No changes since the active publication.'
    );
  });
});
