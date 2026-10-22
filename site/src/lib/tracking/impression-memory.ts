import { readJourneyId } from './journey-memory.ts';

const seenImpressions = new Set<string>();

export function impressionKey(
  turnId: string,
  blockType: string,
  identifier: string | undefined
): string {
  const idPart = identifier ?? '';
  return `${readJourneyId()}:${turnId}:${blockType}:${idPart}`;
}

export function markImpression(key: string): boolean {
  if (seenImpressions.has(key)) {
    return false;
  }
  seenImpressions.add(key);
  return true;
}

export function resetImpressionMemoryForTests(): void {
  seenImpressions.clear();
}
