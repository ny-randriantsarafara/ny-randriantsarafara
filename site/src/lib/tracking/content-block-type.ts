import type { Block } from '@portfolio/content';

export const CONTENT_BLOCK_TYPES = [
  'timeline',
  'experience',
  'project',
  'skills',
  'key-figures',
  'strengths',
  'contact',
  'cv',
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

const contentBlockTypeSet = new Set<string>(CONTENT_BLOCK_TYPES);

export function readContentBlockType(block: Block): ContentBlockType | null {
  if (!contentBlockTypeSet.has(block.type)) {
    return null;
  }
  return block.type;
}

export function readContentIdentifier(block: Block): string | undefined {
  if (block.type === 'experience' || block.type === 'project') {
    return block.slug;
  }
  return undefined;
}
