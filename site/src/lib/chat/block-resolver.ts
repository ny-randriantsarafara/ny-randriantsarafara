import type { Block, Experience, Project, PublicationContent, Skill } from '@portfolio/content';

function experienceBySlug(
  experiences: readonly Experience[],
  slug: string
): Experience | undefined {
  return experiences.find((experience) => experience.slug === slug);
}

function projectBySlug(projects: readonly Project[], slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

function skillBySlug(skills: readonly Skill[], slug: string): Skill | undefined {
  return skills.find((skill) => skill.slug === slug);
}

function allSlugsExist(slugs: readonly string[], exists: (slug: string) => boolean): boolean {
  return slugs.every((slug) => exists(slug));
}

export function isBlockRenderable(block: Block, content: PublicationContent): boolean {
  if (block.type === 'timeline') {
    if (
      block.skillSlug !== undefined &&
      skillBySlug(content.skills, block.skillSlug) === undefined
    ) {
      return false;
    }
    if (block.experienceSlugs !== undefined) {
      return allSlugsExist(
        block.experienceSlugs,
        (slug) => experienceBySlug(content.experiences, slug) !== undefined
      );
    }
    return content.experiences.length > 0;
  }

  if (block.type === 'experience') {
    return experienceBySlug(content.experiences, block.slug) !== undefined;
  }

  if (block.type === 'project') {
    return projectBySlug(content.projects, block.slug) !== undefined;
  }

  if (block.type === 'skills') {
    if (block.capabilitySlug !== undefined) {
      const capabilityExists = content.capabilities.some(
        (capability) => capability.slug === block.capabilitySlug
      );
      if (!capabilityExists) {
        return false;
      }
    }
    if (block.highlightSlugs !== undefined) {
      return allSlugsExist(
        block.highlightSlugs,
        (slug) => skillBySlug(content.skills, slug) !== undefined
      );
    }
    return content.skills.length > 0;
  }

  if (block.type === 'key-figures') {
    return allSlugsExist(block.slugs, (slug) =>
      content.keyFigures.some((figure) => figure.slug === slug)
    );
  }

  if (block.type === 'strengths') {
    return content.answers.some((answer) => answer.slug === block.answerSlug);
  }

  if (block.type === 'contact' || block.type === 'cv') {
    return true;
  }

  return false;
}

export function filterRenderableBlocks(
  blocks: readonly Block[],
  content: PublicationContent
): Block[] {
  return blocks.flatMap((block) => {
    if (!isBlockRenderable(block, content)) {
      return [];
    }
    return [block];
  });
}
