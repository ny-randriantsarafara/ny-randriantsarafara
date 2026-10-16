import { describe, expect, it } from 'vitest';

import {
  backendCapability,
  cloudCapability,
  contentFixture,
  coverageFigure,
  eurosportProject,
  itrasExperience,
  journeyAnswer,
  visaProject,
  warnerExperience,
  whyMeAnswer,
  yearsFigure,
} from './testing/fixture.ts';
import { validatePublicationContent } from './validation.ts';

function problemsOf(candidate: unknown): { path: string; message: string }[] {
  const result = validatePublicationContent(candidate);
  if (result.valid) {
    return [];
  }
  return result.problems;
}

describe('validatePublicationContent', () => {
  it('accepts valid content and returns it parsed', () => {
    expect(validatePublicationContent(contentFixture)).toEqual({
      valid: true,
      content: contentFixture,
    });
  });

  it('names the item slug and field of an empty French text', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        { ...warnerExperience, summary: { en: warnerExperience.summary.en, fr: '  ' } },
        itrasExperience,
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[warner-bros-discovery].summary.fr', message: 'Must not be empty' },
    ]);
  });

  it('reports a missing translation stored as null', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, role: { en: 'Engineer', fr: null } }],
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toEqual([
      'experiences[itras-group].role.fr',
    ]);
  });

  it('reports a skill reference that does not exist', () => {
    const candidate = {
      ...contentFixture,
      experiences: [{ ...warnerExperience, skillSlugs: ['typescript', 'cobol'] }, itrasExperience],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[warner-bros-discovery].skillSlugs', message: 'Unknown skill "cobol"' },
    ]);
  });

  it('reports a block pointing to an unknown project', () => {
    const candidate = {
      ...contentFixture,
      answers: [
        journeyAnswer,
        { ...whyMeAnswer, blocks: [{ type: 'project', slug: 'missing-project' }] },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'answers[why-me].blocks[0]', message: 'Unknown project "missing-project"' },
    ]);
  });

  it('reports a block type outside the catalog', () => {
    const candidate = {
      ...contentFixture,
      answers: [journeyAnswer, { ...whyMeAnswer, blocks: [{ type: 'video' }] }],
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toEqual([
      'answers[why-me].blocks[0].type',
    ]);
  });

  it('reports duplicated slugs', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, slug: 'warner-bros-discovery' }],
    };

    expect(problemsOf(candidate)).toContainEqual({
      path: 'experiences[warner-bros-discovery]',
      message: 'Duplicate slug',
    });
  });

  it('reports highlights that differ in count between languages', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        { ...warnerExperience, highlights: { en: ['One.', 'Two.'], fr: ['Un.'] } },
        itrasExperience,
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'experiences[warner-bros-discovery].highlights',
        message: 'English has 2 items, French has 1',
      },
    ]);
  });

  it('reports an end month before the start month', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, endMonth: '2017-01' }],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[itras-group].endMonth', message: 'Ends before it starts' },
    ]);
  });

  it('accepts a year when the month is not known', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        { ...warnerExperience, startMonth: '2024' },
        { ...itrasExperience, startMonth: '2018', endMonth: '2018' },
      ],
    };

    expect(problemsOf(candidate)).toEqual([]);
  });

  it('compares a year with a month of that year without an order problem', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        warnerExperience,
        { ...itrasExperience, startMonth: '2018-10', endMonth: '2018' },
      ],
    };

    expect(problemsOf(candidate)).toEqual([]);
  });

  it('reports an end year before the start month', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        warnerExperience,
        { ...itrasExperience, startMonth: '2018-10', endMonth: '2017' },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'experiences[itras-group].endMonth', message: 'Ends before it starts' },
    ]);
  });

  it('rejects a month without a year', () => {
    const candidate = {
      ...contentFixture,
      experiences: [warnerExperience, { ...itrasExperience, startMonth: '10-2018' }],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'experiences[itras-group].startMonth',
        message: 'Must be a YYYY-MM month or a YYYY year',
      },
    ]);
  });

  it('accepts a profile without a public location', () => {
    const candidate = {
      ...contentFixture,
      profile: { ...contentFixture.profile, location: { en: '', fr: '' } },
    };

    expect(problemsOf(candidate)).toEqual([]);
  });

  it('reports a strengths block pointing to an unknown answer', () => {
    const candidate = {
      ...contentFixture,
      answers: [
        journeyAnswer,
        { ...whyMeAnswer, blocks: [{ type: 'strengths', answerSlug: 'x' }] },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      { path: 'answers[why-me].blocks[0]', message: 'Unknown answer "x"' },
    ]);
  });

  it('reports an icon outside the site registry', () => {
    const candidate = {
      ...contentFixture,
      capabilities: [{ ...cloudCapability, icon: 'rocket' }, backendCapability],
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toEqual([
      'capabilities[cloud].icon',
    ]);
  });

  it('describes the root when the candidate is not an object', () => {
    expect(problemsOf(null).map((problem) => problem.path)).toEqual(['(content)']);
  });

  it('accepts key figures prepared before owners existed', () => {
    const legacyFigures = contentFixture.keyFigures.map((keyFigure) => ({
      slug: keyFigure.slug,
      value: keyFigure.value,
      label: keyFigure.label,
    }));

    const result = validatePublicationContent({ ...contentFixture, keyFigures: legacyFigures });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.content.keyFigures[1]).toMatchObject({
        ownerExperienceSlug: null,
        ownerProjectSlug: null,
      });
    }
  });

  it('reports a key figure owner that does not exist', () => {
    const candidate = {
      ...contentFixture,
      keyFigures: [yearsFigure, { ...coverageFigure, ownerExperienceSlug: 'acme' }],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'keyFigures[coverage-achieved].ownerExperienceSlug',
        message: 'Unknown experience "acme"',
      },
    ]);
  });

  it('reports a key figure with two owners', () => {
    const candidate = {
      ...contentFixture,
      keyFigures: [yearsFigure, { ...coverageFigure, ownerProjectSlug: 'visa-insight' }],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'keyFigures[coverage-achieved]',
        message: 'Set an owner experience or an owner project, not both',
      },
    ]);
  });

  it('reports an owner whose texts do not state the value', () => {
    const candidate = {
      ...contentFixture,
      keyFigures: [
        yearsFigure,
        { ...coverageFigure, ownerExperienceSlug: 'warner-bros-discovery' },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'keyFigures[coverage-achieved].value',
        message: '"82%" does not appear in the en texts of experience "warner-bros-discovery"',
      },
      {
        path: 'keyFigures[coverage-achieved].value',
        message: '"82%" does not appear in the fr texts of experience "warner-bros-discovery"',
      },
    ]);
  });

  it('reports a translation that drops the owned value', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        warnerExperience,
        { ...itrasExperience, highlights: { en: ['Coverage 0% → 82%.'], fr: ['Couverture.'] } },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'keyFigures[coverage-achieved].value',
        message: '"82%" does not appear in the fr texts of experience "itras-group"',
      },
    ]);
  });

  it('reports an answer showing a key figure owned by an experience it does not reference', () => {
    const candidate = {
      ...contentFixture,
      answers: [
        journeyAnswer,
        {
          ...whyMeAnswer,
          experienceSlugs: ['warner-bros-discovery'],
          keyFigureSlugs: ['coverage-achieved'],
          blocks: [{ type: 'key-figures', slugs: ['coverage-achieved'] }],
        },
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'answers[why-me].keyFigureSlugs',
        message:
          'Key figure "coverage-achieved" belongs to experience "itras-group", which this answer does not reference',
      },
      {
        path: 'answers[why-me].blocks[0]',
        message:
          'Key figure "coverage-achieved" belongs to experience "itras-group", which this answer does not reference',
      },
    ]);
  });

  it('accepts answers prepared before follow-up questions existed', () => {
    const legacyAnswers = contentFixture.answers.map(({ followUpQuestions, ...answer }) => {
      void followUpQuestions;
      return answer;
    });

    const result = validatePublicationContent({ ...contentFixture, answers: legacyAnswers });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.content.answers[0]?.followUpQuestions).toEqual({ en: [], fr: [] });
    }
  });

  it('accepts a publication prepared before the editorial fields existed', () => {
    const { overview, journey, experienceSummary, coreSkills, ...legacyProfile } =
      contentFixture.profile;
    void overview;
    void journey;
    void experienceSummary;
    void coreSkills;
    const legacySkills = contentFixture.skills.map(({ frenchName, usage, ...skill }) => {
      void frenchName;
      void usage;
      return skill;
    });
    const legacyProjects = contentFixture.projects.map(({ followUpQuestion, ...project }) => {
      void followUpQuestion;
      return project;
    });
    const { shareTitle, shareDescription, ...legacySiteSettings } = contentFixture.siteSettings;
    void shareTitle;
    void shareDescription;

    const result = validatePublicationContent({
      ...contentFixture,
      profile: legacyProfile,
      skills: legacySkills,
      projects: legacyProjects,
      siteSettings: legacySiteSettings,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.content.profile.overview).toBeNull();
      expect(result.content.profile.coreSkills).toBeNull();
      expect(result.content.skills[0]).toMatchObject({ frenchName: null, usage: null });
      expect(result.content.projects[0]?.followUpQuestion).toBeNull();
      expect(result.content.siteSettings.shareTitle).toBeNull();
    }
  });

  it('rejects a skill usage the technologies table does not know', () => {
    const candidate = {
      ...contentFixture,
      skills: contentFixture.skills.map((skill) => ({ ...skill, usage: 'cooking' })),
    };

    expect(problemsOf(candidate).map((problem) => problem.path)).toContain(
      'skills[typescript].usage'
    );
  });

  it('reports a project follow-up question that no answer is prepared for', () => {
    const candidate = {
      ...contentFixture,
      projects: [
        {
          ...eurosportProject,
          followUpQuestion: { en: 'Why should we hire you?', fr: 'Pourquoi vous embaucher ?' },
        },
        visaProject,
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'projects[eurosport-api-platform].followUpQuestion.fr',
        message: 'No answer has "Pourquoi vous embaucher ?" as a sample question',
      },
    ]);
  });

  it('reports a follow-up question that no answer is prepared for', () => {
    const candidate = {
      ...contentFixture,
      answers: [
        {
          ...journeyAnswer,
          followUpQuestions: {
            en: ['Why should we hire you?'],
            fr: ['Pourquoi vous embaucher ?'],
          },
        },
        whyMeAnswer,
      ],
    };

    expect(problemsOf(candidate)).toEqual([
      {
        path: 'answers[journey].followUpQuestions.fr',
        message: 'No answer has "Pourquoi vous embaucher ?" as a sample question',
      },
    ]);
  });
});
