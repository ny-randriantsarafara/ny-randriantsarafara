import type { Block } from './blocks.ts';
import { publicationContentSchema } from './publication.ts';
import type { Answer, Experience, Project, PublicationContent } from './publication.ts';

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
    ...content.answers.flatMap((answer) => answerProblems(answer, slugs)),
  ];
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
  if (experience.endMonth === null || experience.endMonth >= experience.startMonth) {
    return [];
  }
  return [{ path: `${path}.endMonth`, message: 'Ends before it starts' }];
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

function optionalList(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  return [value];
}
