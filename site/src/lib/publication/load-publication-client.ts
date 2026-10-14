import { parseActivePublication } from '@/lib/publication/parse-publication.ts';
import { publicationDataUrl } from '@/lib/publication/publication-data-url.ts';

import type { ActivePublication } from '@portfolio/content';

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

export async function loadPublicationClient(): Promise<ActivePublication> {
  const response = await fetch(publicationDataUrl());
  if (!response.ok) {
    throw new Error(`Publication request failed with status ${response.status}`);
  }
  const raw = parseJson(await response.text());
  return parseActivePublication(raw);
}

export function schedulePublicationPrefetch(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const run = (): void => {
    void fetch(publicationDataUrl());
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run);
    return;
  }
  globalThis.setTimeout(run, 200);
}
