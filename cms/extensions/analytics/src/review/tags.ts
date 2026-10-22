import type { ChatReviewTag } from '@portfolio/cms-schema';

const chatReviewTags: ChatReviewTag[] = [
  'unsupported_claim',
  'wrong_card',
  'incomplete',
  'irrelevant',
  'supported',
];

export function isChatReviewTag(value: string): value is ChatReviewTag {
  for (const tag of chatReviewTags) {
    if (tag === value) {
      return true;
    }
  }
  return false;
}

export function readChatReviewTags(raw: unknown): ChatReviewTag[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const tags: ChatReviewTag[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || !isChatReviewTag(value)) {
      continue;
    }
    tags.push(value);
  }
  return tags;
}

export function parseRequiredChatReviewTags(raw: unknown): ChatReviewTag[] {
  if (!Array.isArray(raw)) {
    throw new Error('Review tags must be an array.');
  }
  const tags: ChatReviewTag[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || !isChatReviewTag(value)) {
      throw new Error(`Unsupported review tag "${String(value)}".`);
    }
    tags.push(value);
  }
  return tags;
}
