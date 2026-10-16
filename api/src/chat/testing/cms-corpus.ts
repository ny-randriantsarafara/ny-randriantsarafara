import type { ChatRequest } from '@portfolio/chat';
import { validatePublicationContent, type ActivePublication } from '@portfolio/content';
import { contentFixture } from '@portfolio/content/testing';

export type CorpusMutation =
  | 'initial'
  | 'updated'
  | 'deleted'
  | 'new-skill'
  | 'empty'
  | 'conflicting';
export type ExpectedFact = { entitySlug: string; field: string; value: string };
export type CorpusCase = {
  active: ActivePublication;
  request: ChatRequest;
  expectedFacts: ExpectedFact[];
  forbiddenFacts: ExpectedFact[];
  expectedEvidenceSlugs: string[];
};
export const developmentSeeds = [7, 23, 61];
export const heldOutSeeds = [101, 137, 193];
export const corpusMutations: CorpusMutation[] = [
  'initial',
  'updated',
  'deleted',
  'new-skill',
  'empty',
  'conflicting',
];

export function makeCmsCorpus(seed: number, mutation: CorpusMutation): CorpusCase {
  if (!Number.isSafeInteger(seed) || seed < 0)
    throw new Error('Expected a nonnegative integer seed');
  const content = structuredClone(contentFixture);
  const slug = `company-${seed}-a`;
  const other = `company-${seed}-b`;
  const oldValue = `${20 + (seed % 17)}%`;
  const value = mutation === 'updated' ? `${70 + (seed % 17)}%` : oldValue;
  content.profile.name = `Candidate ${seed}`;
  content.experiences = [slug, other].map((entitySlug, index) => ({
    slug: entitySlug,
    company: `Company ${seed} ${index === 0 ? 'A' : 'B'}`,
    role: { en: 'Engineer', fr: 'Ingénieur' },
    startMonth: '2021-01',
    endMonth: '2023-01',
    location: 'Remote',
    summary: {
      en: `Coverage at ${entitySlug}: ${index === 0 ? value : '94%'}.`,
      fr: `Couverture chez ${entitySlug} : ${index === 0 ? value : '94%'}.`,
    },
    highlights: { en: [], fr: [] },
    skillSlugs: [],
  }));
  content.capabilities = [];
  content.skills = [];
  content.projects = [];
  content.keyFigures = [];
  content.answers = [
    {
      slug: `coverage-${seed}`,
      topic: { en: 'Coverage', fr: 'Couverture' },
      sampleQuestions: {
        en: ['What coverage did you achieve?'],
        fr: ['Quelle couverture avez-vous atteinte ?'],
      },
      followUpQuestions: { en: [], fr: [] },
      text: { en: `Coverage at ${other}: 94%.`, fr: `Couverture chez ${other} : 94%.` },
      experienceSlugs: [other],
      projectSlugs: [],
      skillSlugs: [],
      keyFigureSlugs: [],
      blocks: [{ type: 'experience', slug: other }],
      starter: false,
    },
  ];
  let expectedFacts: ExpectedFact[] = [{ entitySlug: slug, field: 'summary', value }];
  const forbiddenFacts: ExpectedFact[] = [{ entitySlug: slug, field: 'summary', value: '94%' }];
  let expectedEvidenceSlugs = [slug];
  let question = `What coverage did you achieve at ${slug}?`;
  if (mutation === 'updated')
    forbiddenFacts.push({ entitySlug: slug, field: 'summary', value: oldValue });
  if (mutation === 'deleted') {
    content.experiences = content.experiences.filter((entry) => entry.slug !== slug);
    expectedFacts = [];
    expectedEvidenceSlugs = [];
    forbiddenFacts.push({ entitySlug: slug, field: 'summary', value: oldValue });
  }
  if (mutation === 'new-skill') {
    const projectSlug = `rust-${seed}`;
    content.capabilities = [
      {
        slug: `systems-${seed}`,
        icon: 'server',
        title: { en: 'Systems', fr: 'Systèmes' },
        description: { en: 'Systems engineering', fr: 'Ingénierie système' },
      },
    ];
    content.skills = [
      {
        slug: `rust-skill-${seed}`,
        name: 'Rust',
        capabilitySlug: `systems-${seed}`,
        featured: true,
      },
    ];
    content.projects = [
      {
        slug: projectSlug,
        kind: 'personal',
        icon: null,
        title: { en: `Parser ${seed}`, fr: `Analyseur ${seed}` },
        company: null,
        role: null,
        startYear: 2025,
        endYear: null,
        summary: { en: `Rust CSV parser ${seed}`, fr: `Analyseur CSV Rust ${seed}` },
        caseStudy: null,
        skillSlugs: [`rust-skill-${seed}`],
      },
    ];
    question = `Describe project ${projectSlug}.`;
    expectedFacts = [{ entitySlug: projectSlug, field: 'summary', value: 'Rust' }];
    expectedEvidenceSlugs = [projectSlug];
  }
  const firstAnswer = content.answers[0];
  if (mutation === 'conflicting' && firstAnswer !== undefined) {
    content.answers.push({
      ...firstAnswer,
      slug: `contradiction-${seed}`,
      text: { en: `Coverage at ${slug}: 99%.`, fr: `Couverture chez ${slug} : 99%.` },
      experienceSlugs: [slug],
      blocks: [],
    });
    expectedFacts = [];
  }
  if (mutation === 'empty') {
    content.experiences = [];
    content.answers = [];
    expectedFacts = [];
    expectedEvidenceSlugs = [];
  }
  const validation = validatePublicationContent(content);
  if (!validation.valid) throw new Error(`Invalid generated corpus: ${JSON.stringify(validation)}`);
  return {
    active: {
      publicationId: `00000000-0000-4000-8000-${String(seed * 10 + corpusMutations.indexOf(mutation)).padStart(12, '0')}`,
      activatedAt: '2026-10-15T00:00:00Z',
      content,
    },
    request: {
      locale: 'en',
      conversationId: '00000000-0000-4000-8000-000000000001',
      messages: [
        { role: 'visitor', text: `What coverage at ${slug}?` },
        { role: 'assistant', text: `Coverage at ${slug}: ${oldValue}.` },
        { role: 'visitor', text: question },
      ],
    },
    expectedFacts,
    forbiddenFacts,
    expectedEvidenceSlugs,
  };
}
