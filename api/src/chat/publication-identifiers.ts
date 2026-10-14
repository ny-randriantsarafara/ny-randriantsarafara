import type { Block, PublicationContent } from '@portfolio/content';

export type PublicationIdentifiers = {
  answerSlugs: Set<string>;
  experienceSlugs: Set<string>;
  projectSlugs: Set<string>;
  skillSlugs: Set<string>;
  capabilitySlugs: Set<string>;
  keyFigureSlugs: Set<string>;
  sensitiveTopicSlugs: Set<string>;
};

export function buildPublicationIdentifiers(content: PublicationContent): PublicationIdentifiers {
  return {
    answerSlugs: new Set(content.answers.map((answer) => answer.slug)),
    experienceSlugs: new Set(content.experiences.map((experience) => experience.slug)),
    projectSlugs: new Set(content.projects.map((project) => project.slug)),
    skillSlugs: new Set(content.skills.map((skill) => skill.slug)),
    capabilitySlugs: new Set(content.capabilities.map((capability) => capability.slug)),
    keyFigureSlugs: new Set(content.keyFigures.map((figure) => figure.slug)),
    sensitiveTopicSlugs: new Set(content.chatSettings.sensitiveTopics.map((topic) => topic.slug)),
  };
}

export function modelReplyUsesKnownIdentifiers(
  reply: { answerSlugs: string[]; blocks: Block[]; sensitiveTopicSlug: string | null },
  identifiers: PublicationIdentifiers
): boolean {
  if (!reply.answerSlugs.every((slug) => identifiers.answerSlugs.has(slug))) {
    return false;
  }
  if (
    reply.sensitiveTopicSlug !== null &&
    !identifiers.sensitiveTopicSlugs.has(reply.sensitiveTopicSlug)
  ) {
    return false;
  }
  return reply.blocks.every((block) => blockUsesKnownIdentifiers(block, identifiers));
}

function blockUsesKnownIdentifiers(block: Block, identifiers: PublicationIdentifiers): boolean {
  if (block.type === 'timeline') {
    if (block.skillSlug !== undefined && !identifiers.skillSlugs.has(block.skillSlug)) {
      return false;
    }
    if (block.experienceSlugs !== undefined) {
      return block.experienceSlugs.every((slug) => identifiers.experienceSlugs.has(slug));
    }
    return true;
  }
  if (block.type === 'experience') {
    return identifiers.experienceSlugs.has(block.slug);
  }
  if (block.type === 'project') {
    return identifiers.projectSlugs.has(block.slug);
  }
  if (block.type === 'skills') {
    if (
      block.capabilitySlug !== undefined &&
      !identifiers.capabilitySlugs.has(block.capabilitySlug)
    ) {
      return false;
    }
    if (block.highlightSlugs !== undefined) {
      return block.highlightSlugs.every((slug) => identifiers.skillSlugs.has(slug));
    }
    return true;
  }
  if (block.type === 'key-figures') {
    return block.slugs.every((slug) => identifiers.keyFigureSlugs.has(slug));
  }
  if (block.type === 'strengths') {
    return identifiers.answerSlugs.has(block.answerSlug);
  }
  return true;
}
