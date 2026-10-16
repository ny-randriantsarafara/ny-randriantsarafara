import { companyKey, figureOwner, type Block, type PublicationContent } from '@portfolio/content';

export type BlockScope = {
  experienceSlugs: readonly string[];
  projectSlugs: readonly string[];
};

export type BlockSelection = {
  candidates: readonly Block[];
  // Entities the question is about; null when it names none. Filters every card.
  scope: BlockScope | null;
  // Entities the reply text is about, used for key figures when the question has no scope.
  figureScope: BlockScope | null;
  // Card of the single entity in focus, shown first when no candidate covers it.
  focusCard: Block | null;
  // Answers whose text the reply is or restates: their strengths cards would only repeat it.
  replyAnswerSlugs: readonly string[];
  limit: number;
};

const MAX_KEY_FIGURES = 3;

export function selectBlocks(content: PublicationContent, selection: BlockSelection): Block[] {
  const scoped = selection.candidates.flatMap((block) => scopedBlock(block, content, selection));
  const merged = mergeKeyFigures(scoped);
  const withFocus = withFocusCard(merged, selection.focusCard);
  const informative = withoutRedundantProjects(withFocus, content);
  return distinctBlocks(informative).slice(0, selection.limit);
}

export function scopeOfAnswer(content: PublicationContent, answerSlug: string): BlockScope | null {
  const answer = content.answers.find((candidate) => candidate.slug === answerSlug);
  if (answer === undefined) {
    return null;
  }
  return { experienceSlugs: answer.experienceSlugs, projectSlugs: answer.projectSlugs };
}

function scopedBlock(
  block: Block,
  content: PublicationContent,
  selection: BlockSelection
): Block[] {
  const { scope } = selection;
  switch (block.type) {
    case 'strengths':
      return strengthsBlock(block, content, selection);
    case 'experience':
      return keepWhen(block, scope === null || scope.experienceSlugs.includes(block.slug));
    case 'project':
      return keepWhen(block, scope === null || scope.projectSlugs.includes(block.slug));
    case 'timeline':
      return timelineBlock(block, scope);
    case 'key-figures':
      return keyFiguresBlock(block, content, scope ?? selection.figureScope);
    case 'skills':
    case 'contact':
    case 'cv':
      return [block];
  }
}

function strengthsBlock(
  block: Extract<Block, { type: 'strengths' }>,
  content: PublicationContent,
  selection: BlockSelection
): Block[] {
  if (selection.replyAnswerSlugs.includes(block.answerSlug)) {
    return [];
  }
  if (selection.scope === null) {
    return [block];
  }
  const answerScope = scopeOfAnswer(content, block.answerSlug);
  if (answerScope === null) {
    return [];
  }
  const general = answerScope.experienceSlugs.length === 0 && answerScope.projectSlugs.length === 0;
  return keepWhen(block, general || overlaps(answerScope, selection.scope));
}

function timelineBlock(
  block: Extract<Block, { type: 'timeline' }>,
  scope: BlockScope | null
): Block[] {
  if (scope === null) {
    return [block];
  }
  if (block.experienceSlugs === undefined) {
    return [];
  }
  const experienceSlugs = block.experienceSlugs.filter((slug) =>
    scope.experienceSlugs.includes(slug)
  );
  if (experienceSlugs.length === 0) {
    return [];
  }
  return [{ ...block, experienceSlugs }];
}

// A figure measured at one employer or project never illustrates another one. Unattributed
// figures (profile-wide, such as years of experience) hold whatever the scope.
function keyFiguresBlock(
  block: Extract<Block, { type: 'key-figures' }>,
  content: PublicationContent,
  scope: BlockScope | null
): Block[] {
  const slugs = block.slugs.filter((slug) => {
    const keyFigure = content.keyFigures.find((candidate) => candidate.slug === slug);
    if (keyFigure === undefined) {
      return false;
    }
    const owner = figureOwner(content, keyFigure);
    if (scope === null || owner === null) {
      return true;
    }
    if (owner.kind === 'experience') {
      return scope.experienceSlugs.includes(owner.slug);
    }
    return scope.projectSlugs.includes(owner.slug);
  });
  if (slugs.length === 0) {
    return [];
  }
  return [{ type: 'key-figures', slugs }];
}

function mergeKeyFigures(blocks: readonly Block[]): Block[] {
  const slugs = [
    ...new Set(blocks.flatMap((block) => (block.type === 'key-figures' ? block.slugs : []))),
  ].slice(0, MAX_KEY_FIGURES);
  const firstIndex = blocks.findIndex((block) => block.type === 'key-figures');
  return blocks.flatMap((block, index): Block[] => {
    if (block.type !== 'key-figures') {
      return [block];
    }
    if (index !== firstIndex) {
      return [];
    }
    return [{ type: 'key-figures', slugs }];
  });
}

function withFocusCard(blocks: readonly Block[], focusCard: Block | null): Block[] {
  if (focusCard === null) {
    return [...blocks];
  }
  // A timeline that survived a scope only lists the entities in focus.
  const covered = blocks.some(
    (block) => block.type === 'experience' || block.type === 'project' || block.type === 'timeline'
  );
  if (covered) {
    return [...blocks];
  }
  return [focusCard, ...blocks];
}

// Next to the employer's experience card, a project of that employer only repeats it unless
// it carries a case study.
function withoutRedundantProjects(blocks: readonly Block[], content: PublicationContent): Block[] {
  const experienceCompanies = new Set(
    blocks.flatMap((block) => {
      if (block.type !== 'experience') {
        return [];
      }
      const experience = content.experiences.find((candidate) => candidate.slug === block.slug);
      return experience === undefined ? [] : [companyKey(experience.company)];
    })
  );
  return blocks.filter((block) => {
    if (block.type !== 'project') {
      return true;
    }
    const project = content.projects.find((candidate) => candidate.slug === block.slug);
    if (project === undefined || project.company === null || project.caseStudy !== null) {
      return true;
    }
    return !experienceCompanies.has(companyKey(project.company));
  });
}

function distinctBlocks(blocks: readonly Block[]): Block[] {
  const keys = blocks.map(blockKey);
  return blocks.filter((_block, index) => keys.indexOf(keys[index] ?? '') === index);
}

function blockKey(block: Block): string {
  switch (block.type) {
    case 'experience':
    case 'project':
      return `${block.type}:${block.slug}`;
    case 'strengths':
      return `strengths:${block.answerSlug}`;
    case 'key-figures':
      return `key-figures:${block.slugs.join(',')}`;
    case 'timeline':
      return `timeline:${block.experienceSlugs?.join(',') ?? '*'}:${block.skillSlug ?? ''}`;
    case 'skills':
      return `skills:${block.capabilitySlug ?? ''}:${block.highlightSlugs?.join(',') ?? ''}`;
    case 'contact':
      return `contact:${block.topic ?? ''}`;
    case 'cv':
      return 'cv';
  }
}

function overlaps(left: BlockScope, right: BlockScope): boolean {
  return (
    left.experienceSlugs.some((slug) => right.experienceSlugs.includes(slug)) ||
    left.projectSlugs.some((slug) => right.projectSlugs.includes(slug))
  );
}

function keepWhen(block: Block, keep: boolean): Block[] {
  return keep ? [block] : [];
}
