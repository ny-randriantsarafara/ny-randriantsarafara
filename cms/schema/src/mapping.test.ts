import type { PublicationContent } from '@portfolio/content';
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildPublicationContent } from './mapping.ts';
import type { WorkingRecords } from './mapping.ts';
import { storedRecordsOf } from './testing/records.ts';

function storedRecords(): WorkingRecords {
  return storedRecordsOf(contentFixture);
}

function contentOf(records: WorkingRecords): PublicationContent {
  const result = buildPublicationContent(records);
  if (!result.valid) {
    throw new Error(JSON.stringify(result.problems));
  }
  return result.content;
}

function problemsOf(records: WorkingRecords): { path: string; message: string }[] {
  const result = buildPublicationContent(records);
  if (result.valid) {
    return [];
  }
  return result.problems;
}

describe('buildPublicationContent', () => {
  it('rebuilds the content the records were created from', () => {
    expect(buildPublicationContent(storedRecords())).toEqual({
      valid: true,
      content: contentFixture,
    });
  });

  it('orders items by sort, then by slug', () => {
    const records = storedRecords();

    const content = contentOf({
      ...records,
      skills: records.skills.map((record) => ({ ...record, sort: null })),
      experiences: records.experiences.toReversed(),
    });

    expect(content.skills.map((skill) => skill.slug)).toEqual(['aws', 'java', 'typescript']);
    expect(content.experiences.map((experience) => experience.slug)).toEqual([
      'warner-bros-discovery',
      'itras-group',
    ]);
  });

  it('names the slug and field of an emptied French text', () => {
    const records = storedRecords();
    const experiences = records.experiences.map((record) => ({ ...record, summary_fr: null }));

    expect(problemsOf({ ...records, experiences })).toEqual([
      { path: 'experiences[warner-bros-discovery].summary.fr', message: 'Must not be empty' },
      { path: 'experiences[itras-group].summary.fr', message: 'Must not be empty' },
    ]);
  });

  it('reports a half-filled optional pair as a missing translation', () => {
    const records = storedRecords();
    const projects = records.projects.map((record) => ({ ...record, case_study_en: 'Draft.' }));

    expect(problemsOf({ ...records, projects }).map((problem) => problem.path)).toEqual([
      'projects[eurosport-api-platform].caseStudy.fr',
      'projects[visa-insight].caseStudy.fr',
    ]);
  });

  it('reads one item per line and ignores blank lines', () => {
    const records = storedRecords();
    const [first, ...others] = records.experiences;
    if (first === undefined) {
      throw new Error('The stored records have no experience.');
    }
    const experiences = [
      {
        ...first,
        highlights_en: 'First.\n\n  Second.  \n',
        highlights_fr: 'Premier.\r\nDeuxième.',
      },
      ...others,
    ];

    expect(contentOf({ ...records, experiences }).experiences[0]?.highlights).toEqual({
      en: ['First.', 'Second.'],
      fr: ['Premier.', 'Deuxième.'],
    });
  });

  it('reports a block type written outside the catalog', () => {
    const records = storedRecords();
    const answers = records.answers.map((record) => ({ ...record, blocks: [{ type: 'video' }] }));

    expect(problemsOf({ ...records, answers }).map((problem) => problem.path)).toEqual([
      'answers[journey].blocks[0].type',
      'answers[why-me].blocks[0].type',
    ]);
  });

  it('reports a sensitive topic without keywords', () => {
    const records = storedRecords();
    const chatSettings = {
      ...records.chatSettings,
      sensitive_topics: [
        {
          slug: 'compensation',
          keywords_en: ' ',
          keywords_fr: 'salaire',
          reply_en: 'Let us talk.',
          reply_fr: 'Parlons-en.',
        },
      ],
    };

    expect(problemsOf({ ...records, chatSettings })).toEqual([
      {
        path: 'chatSettings.sensitiveTopics[0].keywords.en',
        message: 'Must have at least one item',
      },
    ]);
  });

  it('reports the fields of a profile that was never saved', () => {
    expect(problemsOf({ ...storedRecords(), profile: {} }).map((problem) => problem.path)).toEqual(
      expect.arrayContaining(['profile.name', 'profile.headline.en', 'profile.email'])
    );
  });
});
