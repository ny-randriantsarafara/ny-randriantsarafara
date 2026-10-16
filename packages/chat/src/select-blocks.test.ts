import type { Block, PublicationContent } from '@portfolio/content';
import {
  contentFixture,
  coverageFigure,
  eurosportProject,
  yearsFigure,
} from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import {
  scopeOfAnswer,
  selectBlocks,
  type BlockScope,
  type BlockSelection,
} from './select-blocks.ts';

const warnerScope: BlockScope = {
  experienceSlugs: ['warner-bros-discovery'],
  projectSlugs: ['eurosport-api-platform'],
};
const itrasScope: BlockScope = { experienceSlugs: ['itras-group'], projectSlugs: [] };
const visaScope: BlockScope = { experienceSlugs: [], projectSlugs: ['visa-insight'] };

function selection(overrides: Partial<BlockSelection>): BlockSelection {
  return {
    candidates: [],
    scope: null,
    figureScope: null,
    focusCard: null,
    replyAnswerSlugs: [],
    limit: 3,
    ...overrides,
  };
}

describe('selectBlocks key figures', () => {
  const figures: Block = { type: 'key-figures', slugs: ['years-experience', 'coverage-achieved'] };

  it('never shows a figure measured at another employer', () => {
    const blocks = selectBlocks(
      contentFixture,
      selection({ candidates: [figures], scope: warnerScope })
    );
    expect(blocks).toEqual([{ type: 'key-figures', slugs: ['years-experience'] }]);
  });

  it('keeps a figure under the scope of its owner', () => {
    const blocks = selectBlocks(
      contentFixture,
      selection({ candidates: [figures], scope: itrasScope })
    );
    expect(blocks).toEqual([figures]);
  });

  it('uses the entities of the reply when the question names none', () => {
    expect(
      selectBlocks(contentFixture, selection({ candidates: [figures], figureScope: warnerScope }))
    ).toEqual([{ type: 'key-figures', slugs: ['years-experience'] }]);
    expect(selectBlocks(contentFixture, selection({ candidates: [figures] }))).toEqual([figures]);
  });

  it('derives the owner from the published texts when none is declared', () => {
    const undeclared: PublicationContent = {
      ...contentFixture,
      keyFigures: [yearsFigure, { ...coverageFigure, ownerExperienceSlug: null }],
    };
    const blocks = selectBlocks(
      undeclared,
      selection({ candidates: [figures], scope: warnerScope })
    );
    expect(blocks).toEqual([{ type: 'key-figures', slugs: ['years-experience'] }]);
  });

  it('merges figures from several cards into the first one', () => {
    const blocks = selectBlocks(
      contentFixture,
      selection({
        candidates: [
          { type: 'key-figures', slugs: ['years-experience'] },
          { type: 'contact' },
          { type: 'key-figures', slugs: ['coverage-achieved', 'years-experience'] },
        ],
      })
    );
    expect(blocks).toEqual([figures, { type: 'contact' }]);
  });
});

describe('selectBlocks cards', () => {
  it('drops the strengths card of the answer that is already the reply', () => {
    const blocks = selectBlocks(
      contentFixture,
      selection({
        candidates: [{ type: 'strengths', answerSlug: 'why-me' }, { type: 'contact' }],
        replyAnswerSlugs: ['why-me'],
      })
    );
    expect(blocks).toEqual([{ type: 'contact' }]);
  });

  it('keeps another answer’s strengths only when that answer is about the scope', () => {
    const candidates: Block[] = [{ type: 'strengths', answerSlug: 'journey' }];
    expect(selectBlocks(contentFixture, selection({ candidates, scope: warnerScope }))).toEqual(
      candidates
    );
    expect(selectBlocks(contentFixture, selection({ candidates, scope: visaScope }))).toEqual([]);
  });

  it('drops a project card that only repeats its employer’s experience card', () => {
    const candidates: Block[] = [
      { type: 'experience', slug: 'warner-bros-discovery' },
      { type: 'project', slug: 'eurosport-api-platform' },
    ];
    expect(selectBlocks(contentFixture, selection({ candidates }))).toEqual([candidates[0]]);

    const withCaseStudy: PublicationContent = {
      ...contentFixture,
      projects: [
        { ...eurosportProject, caseStudy: { en: 'Synthetic case.', fr: 'Cas synthétique.' } },
      ],
    };
    expect(selectBlocks(withCaseStudy, selection({ candidates }))).toEqual(candidates);
  });

  it('shows only the cards of the scope and leads with the entity in focus', () => {
    const blocks = selectBlocks(
      contentFixture,
      selection({
        candidates: [
          { type: 'experience', slug: 'itras-group' },
          { type: 'project', slug: 'visa-insight' },
          { type: 'contact' },
        ],
        scope: warnerScope,
        focusCard: { type: 'experience', slug: 'warner-bros-discovery' },
      })
    );
    expect(blocks).toEqual([
      { type: 'experience', slug: 'warner-bros-discovery' },
      { type: 'contact' },
    ]);
  });

  it('narrows a timeline to the scope and drops the full timeline', () => {
    const narrowed = selectBlocks(
      contentFixture,
      selection({
        candidates: [
          { type: 'timeline', experienceSlugs: ['itras-group', 'warner-bros-discovery'] },
        ],
        scope: warnerScope,
        focusCard: { type: 'experience', slug: 'warner-bros-discovery' },
      })
    );
    expect(narrowed).toEqual([{ type: 'timeline', experienceSlugs: ['warner-bros-discovery'] }]);

    const full = selectBlocks(
      contentFixture,
      selection({ candidates: [{ type: 'timeline' }], scope: warnerScope })
    );
    expect(full).toEqual([]);
  });

  it('removes duplicates before applying the limit', () => {
    const blocks = selectBlocks(
      contentFixture,
      selection({
        candidates: [
          { type: 'contact' },
          { type: 'contact' },
          { type: 'cv' },
          { type: 'project', slug: 'visa-insight' },
          { type: 'skills' },
        ],
        limit: 2,
      })
    );
    expect(blocks).toEqual([{ type: 'contact' }, { type: 'cv' }]);
  });
});

describe('scopeOfAnswer', () => {
  it('returns the entities an answer is about', () => {
    expect(scopeOfAnswer(contentFixture, 'journey')).toEqual({
      experienceSlugs: ['itras-group', 'warner-bros-discovery'],
      projectSlugs: [],
    });
    expect(scopeOfAnswer(contentFixture, 'missing')).toBeNull();
  });
});
