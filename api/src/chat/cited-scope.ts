import { scopeOfAnswer, type BlockScope } from '@portfolio/chat';
import { figureOwner, type PublicationContent } from '@portfolio/content';

import type { EvidenceSource } from './evidence.ts';

// Experiences and projects the cited sources are about; null when they are all profile-wide.
export function citedScope(
  content: PublicationContent,
  sources: readonly EvidenceSource[]
): BlockScope | null {
  const scopes = sources.flatMap((source) => sourceScopes(content, source));
  const experienceSlugs = [...new Set(scopes.flatMap((scope) => scope.experienceSlugs))];
  const projectSlugs = [...new Set(scopes.flatMap((scope) => scope.projectSlugs))];
  if (experienceSlugs.length === 0 && projectSlugs.length === 0) {
    return null;
  }
  return { experienceSlugs, projectSlugs };
}

function sourceScopes(content: PublicationContent, source: EvidenceSource): BlockScope[] {
  const slug = source.entitySlug;
  if (slug === null) {
    return [];
  }
  switch (source.collection) {
    case 'experiences':
      return [{ experienceSlugs: [slug], projectSlugs: [] }];
    case 'projects':
      return [{ experienceSlugs: [], projectSlugs: [slug] }];
    case 'answers':
      return answerScopes(content, slug);
    case 'keyFigures':
      return keyFigureScopes(content, slug);
    case 'profile':
    case 'capabilities':
    case 'skills':
      return [];
  }
}

function answerScopes(content: PublicationContent, answerSlug: string): BlockScope[] {
  const scope = scopeOfAnswer(content, answerSlug);
  return scope === null ? [] : [scope];
}

function keyFigureScopes(content: PublicationContent, keyFigureSlug: string): BlockScope[] {
  const keyFigure = content.keyFigures.find((candidate) => candidate.slug === keyFigureSlug);
  if (keyFigure === undefined) {
    return [];
  }
  const owner = figureOwner(content, keyFigure);
  if (owner === null) {
    return [];
  }
  if (owner.kind === 'experience') {
    return [{ experienceSlugs: [owner.slug], projectSlugs: [] }];
  }
  return [{ experienceSlugs: [], projectSlugs: [owner.slug] }];
}
