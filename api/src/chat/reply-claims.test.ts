import { buildEntityCatalog } from '@portfolio/chat';
import type { PublicationContent } from '@portfolio/content';
import { contentFixture, visaProject } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildEvidenceSources, type EvidenceSource } from './evidence.ts';
import { replyClaimProblems } from './reply-claims.ts';

const catalog = buildEntityCatalog(contentFixture);
const sources = new Map(
  [
    ...buildEvidenceSources(contentFixture, 'en'),
    ...buildEvidenceSources(contentFixture, 'fr'),
  ].map((source) => [source.id, source])
);

const WARNER_SUMMARY = 'experiences/warner-bros-discovery/summary/en';
const ITRAS_COVERAGE = 'experiences/itras-group/highlights/en/0';

function cited(ids: readonly string[]): EvidenceSource[] {
  return ids.map((id) => {
    const source = sources.get(id);
    if (source === undefined) throw new Error(`Missing source ${id}`);
    return source;
  });
}

function problemsOf(
  text: string,
  sourceIds: readonly string[],
  entitiesMustBeCited = true,
  question = ''
) {
  return replyClaimProblems({
    text,
    sources: cited(sourceIds),
    content: contentFixture,
    catalog,
    entitiesMustBeCited,
    question,
  });
}

describe('replyClaimProblems', () => {
  it('accepts figures restated from the employer they belong to', () => {
    expect(
      problemsOf('At ITRAS Group I raised coverage from 0% to 82%.', [ITRAS_COVERAGE])
    ).toEqual([]);
    expect(
      problemsOf('Chez ITRAS Group, la couverture est passée de 0 à 82 %.', [
        'experiences/itras-group/highlights/fr/0',
      ])
    ).toEqual([]);
  });

  it('rejects a figure the cited sources do not state', () => {
    expect(problemsOf('At ITRAS Group coverage reached 95%.', [ITRAS_COVERAGE])).toEqual([
      'unsupported_figure',
    ]);
  });

  it('lets a reply deny a figure the question states', () => {
    const question = 'Your team at Warner Bros. Discovery had 15 developers, right?';
    expect(
      problemsOf(
        'No, I have not published the size of my team at Warner Bros. Discovery, so I cannot confirm 15 developers.',
        [WARNER_SUMMARY],
        true,
        question
      )
    ).toEqual([]);
    expect(
      problemsOf(
        'Non, je ne suis pas resté 5 ans chez ITRAS Group : j’y ai travaillé de 2018 à 2020.',
        ['experiences/itras-group/highlights/fr/0'],
        true,
        'Vous êtes resté 5 ans chez ITRAS Group, non ?'
      )
    ).toEqual([]);
  });

  it('still rejects a figure the question states when the reply asserts it', () => {
    const question = 'Your team at Warner Bros. Discovery had 15 developers, right?';
    expect(
      problemsOf(
        'Yes, my team at Warner Bros. Discovery had 15 developers.',
        [WARNER_SUMMARY],
        true,
        question
      )
    ).toEqual(['unsupported_figure']);
    expect(problemsOf('No, it had 12 developers.', [WARNER_SUMMARY], true, question)).toEqual([
      'unsupported_figure',
    ]);
  });

  it('attributes no figure to a project because its title says tests', () => {
    const content: PublicationContent = {
      ...contentFixture,
      projects: [
        ...contentFixture.projects,
        {
          ...visaProject,
          slug: 'media-apis',
          title: { en: 'Euronews: APIs and tests', fr: 'Euronews : API et tests' },
          company: 'Euronews',
        },
      ],
    };
    const problems = replyClaimProblems({
      text: 'Chez ITRAS Group, j’ai travaillé avec Angular. La couverture des tests est passée de 0 % à 82 %.',
      sources: cited([
        'experiences/itras-group/summary/fr',
        'experiences/itras-group/highlights/fr/0',
      ]),
      content,
      catalog: buildEntityCatalog(content),
      entitiesMustBeCited: true,
      question: 'Qu’avez-vous fait chez ITRAS Group ?',
    });
    expect(problems).toEqual([]);
  });

  it('rejects a figure moved to another employer', () => {
    expect(
      problemsOf('At Warner Bros. Discovery I raised coverage to 82%.', [
        WARNER_SUMMARY,
        ITRAS_COVERAGE,
      ])
    ).toEqual(['misattributed_figure']);
    expect(
      problemsOf(
        'I built Eurosport content APIs at Warner Bros. Discovery. Coverage reached 82%.',
        [WARNER_SUMMARY, ITRAS_COVERAGE]
      )
    ).toEqual(['misattributed_figure']);
    expect(
      problemsOf(
        'At ITRAS Group I worked with Angular, and coverage reached 82% at Warner Bros. Discovery.',
        [WARNER_SUMMARY, ITRAS_COVERAGE]
      )
    ).toEqual(['misattributed_figure']);
  });

  it('attributes each clause to the employer it names', () => {
    expect(
      problemsOf(
        'At Warner Bros. Discovery I built content APIs, and at ITRAS Group coverage reached 82%.',
        [WARNER_SUMMARY, ITRAS_COVERAGE]
      )
    ).toEqual([]);
  });

  it('accepts a key figure through its declared owner', () => {
    expect(
      problemsOf('At ITRAS Group I reached 82% coverage.', ['keyFigures/coverage-achieved/value'])
    ).toEqual([]);
  });

  it('lets profile-wide figures and career-wide sentences stand next to an employer', () => {
    expect(
      problemsOf('At Warner Bros. Discovery I build content APIs with 8+ years of experience.', [
        WARNER_SUMMARY,
        'keyFigures/years-experience/value',
      ])
    ).toEqual([]);
    expect(
      problemsOf(
        'I build Eurosport content APIs at Warner Bros. Discovery. Across my career I raised coverage to 82%.',
        [WARNER_SUMMARY, ITRAS_COVERAGE]
      )
    ).toEqual([]);
  });

  it('checks years against the cited entities dates', () => {
    expect(
      problemsOf('I have worked at Warner Bros. Discovery since 2024.', [WARNER_SUMMARY])
    ).toEqual([]);
    expect(
      problemsOf('I have worked at Warner Bros. Discovery since 2021.', [WARNER_SUMMARY])
    ).toEqual(['unsupported_figure']);
  });

  it('ignores small counts that are ordinary wording', () => {
    expect(
      problemsOf('Two things matter at Warner Bros. Discovery: content APIs and Terraform.', [
        WARNER_SUMMARY,
        'experiences/warner-bros-discovery/highlights/en/0',
      ])
    ).toEqual([]);
  });

  it('rejects an employer or project no cited source covers', () => {
    expect(
      problemsOf(
        'At Warner Bros. Discovery I built content APIs, and Visa Insight reviews cases.',
        [WARNER_SUMMARY]
      )
    ).toEqual(['uncited_entity']);
    expect(
      problemsOf('I worked on Eurosport content APIs.', [
        'projects/eurosport-api-platform/summary/en',
      ])
    ).toEqual([]);
  });

  it('lets a clarification name the entities it asks about', () => {
    expect(problemsOf('Do you mean Warner Bros. Discovery or Visa Insight?', [], false)).toEqual(
      []
    );
  });

  it('rejects an employer the publication does not mention', () => {
    expect(problemsOf('At Google I built content APIs.', [WARNER_SUMMARY])).toEqual([
      'unpublished_organization',
    ]);
    expect(problemsOf('I worked at two employers on content APIs.', [WARNER_SUMMARY])).toEqual([]);
  });

  it('rejects commitments the publication does not make', () => {
    expect(problemsOf('I can start next month on content APIs.', [WARNER_SUMMARY])).toEqual([
      'unsupported_commitment',
    ]);
    expect(problemsOf('Je peux commencer le mois prochain.', [WARNER_SUMMARY])).toEqual([
      'unsupported_commitment',
    ]);
    expect(problemsOf('I am available and can start soon.', ['profile/availability/en'])).toEqual(
      []
    );
  });

  it('rejects a leadership claim without published evidence for that employer', () => {
    expect(
      problemsOf('At Warner Bros. Discovery I led the content API team.', [WARNER_SUMMARY])
    ).toEqual(['unsupported_responsibility']);
    expect(
      problemsOf('I managed to migrate Warner Bros. Discovery to Terraform.', [
        'experiences/warner-bros-discovery/highlights/en/0',
      ])
    ).toEqual([]);
  });
});
