import type { ActivePublication, PublicationContent } from '@portfolio/content';

const seedPublicationId = '00000000-0000-4000-8000-000000000000';
const seedActivatedAt = '2026-01-01T00:00:00.000Z';

export function seedPublication(content: PublicationContent): ActivePublication {
  return {
    publicationId: seedPublicationId,
    activatedAt: seedActivatedAt,
    content,
  };
}

export async function fetchActivePublication(
  apiUrl: string,
  fetchImpl: typeof fetch
): Promise<unknown> {
  const url = `${apiUrl}/content/active`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Content API returned ${response.status} from ${url}`);
  }
  const body: unknown = await response.json();
  return body;
}
