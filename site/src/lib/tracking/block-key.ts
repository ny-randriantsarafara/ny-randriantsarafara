import type { Block } from '@portfolio/content';

export function readBlockTrackingKey(block: Block): {
  blockType: string;
  identifier: string | undefined;
} {
  if (block.type === 'experience' || block.type === 'project') {
    return { blockType: block.type, identifier: block.slug };
  }
  return { blockType: block.type, identifier: undefined };
}
