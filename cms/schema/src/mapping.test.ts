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

  it('leaves archived items out and reports references to them', () => {
    const records = storedRecords();
    const [project] = records.projects;
    const [answer, ...otherAnswers] = records.answers;
    if (project === undefined || answer === undefined) {
      throw new Error('The stored records have no project or answer.');
    }
    const retired = { ...project, id: 'retired', slug: 'retired-project', archived: true };
    const withRetired = { ...records, projects: [...records.projects, retired] };

    expect(contentOf(withRetired).projects.map((item) => item.slug)).not.toContain(
      'retired-project'
    );
    expect(
      contentOf({
        ...withRetired,
        projects: [...records.projects, { ...retired, archived: false }],
      }).projects.map((item) => item.slug)
    ).toContain('retired-project');
    expect(
      problemsOf({
        ...withRetired,
        answers: [{ ...answer, project_slugs: ['retired-project'] }, ...otherAnswers],
      })
    ).toEqual([
      {
        path: `answers[${answer.slug}].projectSlugs`,
        message: 'Unknown project "retired-project"',
      },
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

  it('reads no follow-up questions from an answer saved before the field existed', () => {
    const records = storedRecords();
    const answers = records.answers.map(
      ({ follow_up_questions_en, follow_up_questions_fr, ...record }) => {
        void follow_up_questions_en;
        void follow_up_questions_fr;
        return record;
      }
    );

    expect(contentOf({ ...records, answers }).answers[0]?.followUpQuestions).toEqual({
      en: [],
      fr: [],
    });
  });

  it('reads a French skill name and leaves blank editorial texts out', () => {
    const records = storedRecords();
    const skills = records.skills.map((record) => ({ ...record, french_name: 'Services AWS' }));
    const profile = { ...records.profile, core_skills_en: ' ', core_skills_fr: ' ' };
    const content = contentOf({ ...records, skills, profile });

    expect(content.skills[0]?.frenchName).toBe('Services AWS');
    expect(content.profile.coreSkills).toBeNull();
  });

  it('reads no editorial texts from records saved before the fields existed', () => {
    const records = storedRecords();
    const { overview_en, overview_fr, ...profile } = records.profile;
    void overview_en;
    void overview_fr;
    const projects = records.projects.map(
      ({ follow_up_question_en, follow_up_question_fr, ...record }) => {
        void follow_up_question_en;
        void follow_up_question_fr;
        return record;
      }
    );
    const skills = records.skills.map(({ french_name, usage, ...record }) => {
      void french_name;
      void usage;
      return record;
    });
    const content = contentOf({ ...records, profile, projects, skills });

    expect(content.profile.overview).toBeNull();
    expect(content.projects[0]?.followUpQuestion).toBeNull();
    expect(content.skills[0]).toMatchObject({ frenchName: null, usage: null });
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
