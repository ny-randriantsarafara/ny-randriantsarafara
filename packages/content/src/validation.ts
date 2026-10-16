import type { Block } from './blocks.ts';
import {
  declaredFigureOwner,
  ownerTexts,
  parseFigureValue,
  textMentionsFigure,
} from './figures.ts';
import type { FigureOwner } from './figures.ts';
import { localeSchema } from './localized.ts';
import type { Locale } from './localized.ts';
import { publicationContentSchema } from './publication.ts';
import type { Answer, Experience, KeyFigure, Project, PublicationContent } from './publication.ts';

export type PublicationProblem = { path: string; message: string };

export type PublicationValidation =
  | { valid: true; content: PublicationContent }
  | { valid: false; problems: PublicationProblem[] };

type Issue = { path: readonly PropertyKey[]; message: string };

type SlugSets = {
  capabilities: ReadonlySet<string>;
  skills: ReadonlySet<string>;
  experiences: ReadonlySet<string>;
  projects: ReadonlySet<string>;
  keyFigures: ReadonlySet<string>;
  answers: ReadonlySet<string>;
};

const slugCollections: ReadonlySet<string> = new Set([
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'keyFigures',
  'answers',
]);

export function validatePublicationContent(candidate: unknown): PublicationValidation {
  const parsed = publicationContentSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      valid: false,
      problems: parsed.error.issues.map((issue) => toProblem(candidate, issue)),
    };
  }
  const problems = findReferenceProblems(parsed.data);
  if (problems.length > 0) {
    return { valid: false, problems };
  }
  return { valid: true, content: parsed.data };
}

function toProblem(candidate: unknown, issue: Issue): PublicationProblem {
  return { path: formatPath(candidate, issue.path), message: issue.message };
}

function formatPath(candidate: unknown, path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '(content)';
  }
  const [collection, position, ...rest] = path;
  if (typeof collection !== 'string' || typeof position !== 'number') {
    return joinSegments(path.map(formatSegment));
  }
  if (!slugCollections.has(collection)) {
    return joinSegments(path.map(formatSegment));
  }
  const label = readSlugAt(candidate, collection, position) ?? String(position);
  return joinSegments([`${collection}[${label}]`, ...rest.map(formatSegment)]);
}

function formatSegment(segment: PropertyKey): string {
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }
  return String(segment);
}

function joinSegments(segments: readonly string[]): string {
  return segments.reduce((joined, segment) => {
    if (joined === '') {
      return segment;
    }
    if (segment.startsWith('[')) {
      return `${joined}${segment}`;
    }
    return `${joined}.${segment}`;
  }, '');
}

function readSlugAt(candidate: unknown, collection: string, position: number): string | null {
  if (!isRecord(candidate)) {
    return null;
  }
  const items = candidate[collection];
  if (!Array.isArray(items)) {
    return null;
  }
  const item: unknown = items[position];
  if (!isRecord(item)) {
    return null;
  }
  const slug = item['slug'];
  if (typeof slug !== 'string' || slug === '') {
    return null;
  }
  return slug;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findReferenceProblems(content: PublicationContent): PublicationProblem[] {
  const slugs: SlugSets = {
    capabilities: slugSet(content.capabilities),
    skills: slugSet(content.skills),
    experiences: slugSet(content.experiences),
    projects: slugSet(content.projects),
    keyFigures: slugSet(content.keyFigures),
    answers: slugSet(content.answers),
  };
  return [
    ...duplicateSlugProblems('capabilities', content.capabilities),
    ...duplicateSlugProblems('skills', content.skills),
    ...duplicateSlugProblems('experiences', content.experiences),
    ...duplicateSlugProblems('projects', content.projects),
    ...duplicateSlugProblems('keyFigures', content.keyFigures),
    ...duplicateSlugProblems('answers', content.answers),
    ...duplicateSlugProblems('chatSettings.sensitiveTopics', content.chatSettings.sensitiveTopics),
    ...content.skills.flatMap((skill) =>
      missingReferences(
        `skills[${skill.slug}].capabilitySlug`,
        [skill.capabilitySlug],
        slugs.capabilities,
        'capability'
      )
    ),
    ...content.experiences.flatMap((experience) => experienceProblems(experience, slugs)),
    ...content.projects.flatMap((project) => projectProblems(project, slugs)),
    ...content.keyFigures.flatMap((keyFigure) => keyFigureProblems(keyFigure, content, slugs)),
    ...content.answers.flatMap((answer) => answerProblems(answer, slugs)),
    ...content.answers.flatMap((answer) => answerFigureOwnerProblems(answer, content)),
    ...content.answers.flatMap((answer) => followUpProblems(answer, content)),
    ...content.projects.flatMap((project) => projectFollowUpProblems(project, content)),
  ];
}

// A follow-up is offered to the visitor as a question to ask: an answer must be prepared for it.
function followUpProblems(answer: Answer, content: PublicationContent): PublicationProblem[] {
  return localeSchema.options.flatMap((locale) =>
    unpreparedQuestionProblems(
      `answers[${answer.slug}].followUpQuestions.${locale}`,
      answer.followUpQuestions[locale],
      content,
      locale
    )
  );
}

function projectFollowUpProblems(
  project: Project,
  content: PublicationContent
): PublicationProblem[] {
  const { followUpQuestion } = project;
  if (followUpQuestion === null) {
    return [];
  }
  return localeSchema.options.flatMap((locale) =>
    unpreparedQuestionProblems(
      `projects[${project.slug}].followUpQuestion.${locale}`,
      [followUpQuestion[locale]],
      content,
      locale
    )
  );
}

function unpreparedQuestionProblems(
  path: string,
  questions: readonly string[],
  content: PublicationContent,
  locale: Locale
): PublicationProblem[] {
  return questions
    .filter((question) => !hasPreparedAnswer(content, question, locale))
    .map((question) => ({ path, message: `No answer has "${question}" as a sample question` }));
}

function hasPreparedAnswer(content: PublicationContent, question: string, locale: Locale): boolean {
  return content.answers.some((answer) => answer.sampleQuestions[locale].includes(question));
}

function keyFigureProblems(
  keyFigure: KeyFigure,
  content: PublicationContent,
  slugs: SlugSets
): PublicationProblem[] {
  const path = `keyFigures[${keyFigure.slug}]`;
  if (keyFigure.ownerExperienceSlug !== null && keyFigure.ownerProjectSlug !== null) {
    return [{ path, message: 'Set an owner experience or an owner project, not both' }];
  }
  const missing = [
    ...missingReferences(
      `${path}.ownerExperienceSlug`,
      optionalList(keyFigure.ownerExperienceSlug),
      slugs.experiences,
      'experience'
    ),
    ...missingReferences(
      `${path}.ownerProjectSlug`,
      optionalList(keyFigure.ownerProjectSlug),
      slugs.projects,
      'project'
    ),
  ];
  if (missing.length > 0) {
    return missing;
  }
  return figureProvenanceProblems(path, keyFigure, content);
}

// A declared owner must state the value itself, in each language, so a figure can only be
// attributed to the experience or project it was actually measured on.
function figureProvenanceProblems(
  path: string,
  keyFigure: KeyFigure,
  content: PublicationContent
): PublicationProblem[] {
  const owner = declaredFigureOwner(keyFigure);
  const figure = parseFigureValue(keyFigure.value);
  if (owner === null || figure === null) {
    return [];
  }
  return localeSchema.options.flatMap((locale) => {
    const texts = ownerTexts(content, owner, locale) ?? [];
    if (texts.some((text) => textMentionsFigure(text, figure))) {
      return [];
    }
    return [
      {
        path: `${path}.value`,
        message: `"${keyFigure.value}" does not appear in the ${locale} texts of ${ownerLabel(owner)}`,
      },
    ];
  });
}

function answerFigureOwnerProblems(
  answer: Answer,
  content: PublicationContent
): PublicationProblem[] {
  const path = `answers[${answer.slug}]`;
  const listed = answer.keyFigureSlugs.map((slug) => ({ path: `${path}.keyFigureSlugs`, slug }));
  const shown = answer.blocks.flatMap((block, index) =>
    block.type === 'key-figures'
      ? block.slugs.map((slug) => ({ path: `${path}.blocks[${index}]`, slug }))
      : []
  );
  return [...listed, ...shown].flatMap((reference) => {
    const keyFigure = content.keyFigures.find((candidate) => candidate.slug === reference.slug);
    const owner = keyFigure === undefined ? null : declaredFigureOwner(keyFigure);
    if (owner === null || answerReferencesOwner(answer, owner)) {
      return [];
    }
    return [
      {
        path: reference.path,
        message: `Key figure "${reference.slug}" belongs to ${ownerLabel(owner)}, which this answer does not reference`,
      },
    ];
  });
}

function answerReferencesOwner(answer: Answer, owner: FigureOwner): boolean {
  if (owner.kind === 'experience') {
    return answer.experienceSlugs.includes(owner.slug);
  }
  return answer.projectSlugs.includes(owner.slug);
}

function ownerLabel(owner: FigureOwner): string {
  return `${owner.kind} "${owner.slug}"`;
}

function slugSet(items: readonly { slug: string }[]): ReadonlySet<string> {
  return new Set(items.map((item) => item.slug));
}

function duplicateSlugProblems(
  path: string,
  items: readonly { slug: string }[]
): PublicationProblem[] {
  const slugs = items.map((item) => item.slug);
  const duplicates = new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index));
  return [...duplicates].map((slug) => ({ path: `${path}[${slug}]`, message: 'Duplicate slug' }));
}

function missingReferences(
  path: string,
  referenced: readonly string[],
  known: ReadonlySet<string>,
  kind: string
): PublicationProblem[] {
  return referenced
    .filter((slug) => !known.has(slug))
    .map((slug) => ({ path, message: `Unknown ${kind} "${slug}"` }));
}

function experienceProblems(experience: Experience, slugs: SlugSets): PublicationProblem[] {
  const path = `experiences[${experience.slug}]`;
  return [
    ...missingReferences(`${path}.skillSlugs`, experience.skillSlugs, slugs.skills, 'skill'),
    ...highlightCountProblems(path, experience),
    ...monthOrderProblems(path, experience),
  ];
}

function highlightCountProblems(path: string, experience: Experience): PublicationProblem[] {
  const english = experience.highlights.en.length;
  const french = experience.highlights.fr.length;
  if (english === french) {
    return [];
  }
  return [
    { path: `${path}.highlights`, message: `English has ${english} items, French has ${french}` },
  ];
}

function monthOrderProblems(path: string, experience: Experience): PublicationProblem[] {
  if (experience.endMonth === null) {
    return [];
  }
  if (latestMonth(experience.endMonth) >= earliestMonth(experience.startMonth)) {
    return [];
  }
  return [{ path: `${path}.endMonth`, message: 'Ends before it starts' }];
}

// A year alone may start in January and end in December.
function earliestMonth(month: string): string {
  if (month.length === 4) {
    return `${month}-01`;
  }
  return month;
}

function latestMonth(month: string): string {
  if (month.length === 4) {
    return `${month}-12`;
  }
  return month;
}

function projectProblems(project: Project, slugs: SlugSets): PublicationProblem[] {
  const path = `projects[${project.slug}]`;
  return [
    ...missingReferences(`${path}.skillSlugs`, project.skillSlugs, slugs.skills, 'skill'),
    ...yearOrderProblems(path, project),
  ];
}

function yearOrderProblems(path: string, project: Project): PublicationProblem[] {
  if (project.startYear === null || project.endYear === null) {
    return [];
  }
  if (project.endYear >= project.startYear) {
    return [];
  }
  return [{ path: `${path}.endYear`, message: 'Ends before it starts' }];
}

function answerProblems(answer: Answer, slugs: SlugSets): PublicationProblem[] {
  const path = `answers[${answer.slug}]`;
  return [
    ...missingReferences(
      `${path}.experienceSlugs`,
      answer.experienceSlugs,
      slugs.experiences,
      'experience'
    ),
    ...missingReferences(`${path}.projectSlugs`, answer.projectSlugs, slugs.projects, 'project'),
    ...missingReferences(`${path}.skillSlugs`, answer.skillSlugs, slugs.skills, 'skill'),
    ...missingReferences(
      `${path}.keyFigureSlugs`,
      answer.keyFigureSlugs,
      slugs.keyFigures,
      'key figure'
    ),
    ...answer.blocks.flatMap((block, index) =>
      blockProblems(`${path}.blocks[${index}]`, block, slugs)
    ),
  ];
}

function blockProblems(path: string, block: Block, slugs: SlugSets): PublicationProblem[] {
  switch (block.type) {
    case 'timeline':
      return [
        ...missingReferences(path, block.experienceSlugs ?? [], slugs.experiences, 'experience'),
        ...missingReferences(path, optionalList(block.skillSlug), slugs.skills, 'skill'),
      ];
    case 'experience':
      return missingReferences(path, [block.slug], slugs.experiences, 'experience');
    case 'project':
      return missingReferences(path, [block.slug], slugs.projects, 'project');
    case 'skills':
      return [
        ...missingReferences(
          path,
          optionalList(block.capabilitySlug),
          slugs.capabilities,
          'capability'
        ),
        ...missingReferences(path, block.highlightSlugs ?? [], slugs.skills, 'skill'),
      ];
    case 'key-figures':
      return missingReferences(path, block.slugs, slugs.keyFigures, 'key figure');
    case 'strengths':
      return missingReferences(path, [block.answerSlug], slugs.answers, 'answer');
    case 'contact':
    case 'cv':
      return [];
  }
}

function optionalList(value: string | null | undefined): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}
