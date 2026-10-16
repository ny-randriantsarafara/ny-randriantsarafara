import { describe, expect, it } from 'vitest';

import {
  backendCapability,
  cloudCapability,
  contentFixture,
  coverageFigure,
  itrasExperience,
  journeyAnswer,
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
  it('accepts omitted public locations and year-only dates without inventing a month', () => {
    const candidate = {
      ...contentFixture,
      profile: { ...contentFixture.profile, location: { en: '', fr: '' } },
      experiences: [{ ...warnerExperience, startMonth: '2024' }, itrasExperience],
    };
    expect(validatePublicationContent(candidate).valid).toBe(true);
  });

  it('compares mixed date precision without treating an end year as January', () => {
    const candidate = {
      ...contentFixture,
      experiences: [
        { ...warnerExperience, startMonth: '2024-03', endMonth: '2024' },
        itrasExperience,
      ],
    };
    expect(validatePublicationContent(candidate).valid).toBe(true);
    expect(
      validatePublicationContent({
        ...candidate,
        experiences: [
          { ...warnerExperience, startMonth: '2024', endMonth: '2023-12' },
          itrasExperience,
        ],
      }).valid
    ).toBe(false);
  });
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
});
