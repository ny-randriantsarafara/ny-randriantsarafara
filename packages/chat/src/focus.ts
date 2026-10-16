import type { Block, Locale } from '@portfolio/content';

import { entitiesInText, type FocusEntity } from './entities.ts';
import { normalizeQuestion } from './normalize.ts';
import { containsPhrase, toPaddedWords } from './phrase-match.ts';
import type { BlockScope } from './select-blocks.ts';

export type Focus =
  | { kind: 'none' }
  | { kind: 'explicit'; entities: readonly FocusEntity[] }
  | { kind: 'inherited'; entity: FocusEntity }
  | { kind: 'ambiguous' };

const FOLLOW_UP_OPENERS = [
  'and',
  'what about',
  'how about',
  'also',
  'et',
  'aussi',
  'quid de',
  'et pour',
  'et cote',
  'et concernant',
].map(toPaddedWords);

const BACK_REFERENCES = [
  'that role',
  'that job',
  'that company',
  'that project',
  'that team',
  'this role',
  'this project',
  'ce poste',
  'ce role',
  'cette entreprise',
  'ce projet',
  'cette mission',
  'cette equipe',
  'la bas',
].map(toPaddedWords);

const MAX_FOLLOW_UP_TOKENS = 2;

export function resolveFocus(
  catalog: readonly FocusEntity[],
  question: string,
  locale: Locale,
  priorVisitorTexts: readonly string[]
): Focus {
  const named = entitiesInText(catalog, question);
  if (named.length > 0) {
    return { kind: 'explicit', entities: named };
  }
  const followUp = followUpKind(question, locale);
  if (followUp === null) {
    return { kind: 'none' };
  }
  const [first, ...others] = previouslyNamedEntities(catalog, priorVisitorTexts, locale);
  if (first !== undefined && others.length === 0) {
    return { kind: 'inherited', entity: first };
  }
  if (first !== undefined) {
    return { kind: 'ambiguous' };
  }
  // "And the tests?" opening a conversation refers to nothing the visitor has said.
  if (priorVisitorTexts.length === 0 && followUp === 'marked') {
    return { kind: 'ambiguous' };
  }
  return { kind: 'none' };
}

export function focusEntities(focus: Focus): readonly FocusEntity[] {
  switch (focus.kind) {
    case 'explicit':
      return focus.entities;
    case 'inherited':
      return [focus.entity];
    case 'none':
    case 'ambiguous':
      return [];
  }
}

export function scopeOf(entities: readonly FocusEntity[]): BlockScope | null {
  if (entities.length === 0) {
    return null;
  }
  return {
    experienceSlugs: [...new Set(entities.flatMap((entity) => entity.experienceSlugs))],
    projectSlugs: [...new Set(entities.flatMap((entity) => entity.projectSlugs))],
  };
}

export function entityCard(entity: FocusEntity): Block | null {
  const experienceSlug = entity.experienceSlugs[0];
  if (experienceSlug !== undefined) {
    return { type: 'experience', slug: experienceSlug };
  }
  const projectSlug = entity.projectSlugs[0];
  if (projectSlug !== undefined) {
    return { type: 'project', slug: projectSlug };
  }
  return null;
}

// "marked": an opener or a back-reference says the question continues another one.
// "short": a question too short to stand alone.
function followUpKind(question: string, locale: Locale): 'marked' | 'short' | null {
  const padded = toPaddedWords(question);
  if (FOLLOW_UP_OPENERS.some((opener) => padded.startsWith(opener))) {
    return 'marked';
  }
  if (BACK_REFERENCES.some((phrase) => containsPhrase(padded, phrase))) {
    return 'marked';
  }
  if (normalizeQuestion(question, locale).length <= MAX_FOLLOW_UP_TOKENS) {
    return 'short';
  }
  return null;
}

// Walks back through follow-ups only: "Euronews?" → "And the tests?" → "And CI?" keeps Euronews,
// but a self-contained question in between ends the inherited context.
function previouslyNamedEntities(
  catalog: readonly FocusEntity[],
  priorVisitorTexts: readonly string[],
  locale: Locale
): FocusEntity[] {
  const latestFirst = priorVisitorTexts.toReversed();
  for (const text of latestFirst) {
    const named = entitiesInText(catalog, text);
    if (named.length > 0) {
      return named;
    }
    if (followUpKind(text, locale) === null) {
      return [];
    }
  }
  return [];
}
