import { z } from 'zod';

const aggregateResponseSchema = z.object({
  data: z
    .array(
      z.object({
        count: z
          .object({
            id: z.union([z.string(), z.number(), z.null()]).optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

export type ModelFailureSource = {
  countRecentFailures(sinceIso: string): Promise<number>;
};

export function createDirectusModelFailureSource(
  directusUrl: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch
): ModelFailureSource {
  const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;

  return {
    countRecentFailures: (sinceIso) => countFailures(baseUrl, apiToken, sinceIso, fetchImpl),
  };
}

async function countFailures(
  baseUrl: string,
  apiToken: string,
  sinceIso: string,
  fetchImpl: typeof fetch
): Promise<number> {
  const query = new URLSearchParams();
  query.set('aggregate[count]', 'id');
  query.set('filter[date_created][_gte]', sinceIso);
  query.set('filter[failure_reason][_starts_with]', 'model_');
  query.set('filter[failure_reason][_nin]', 'model_disabled,model_daily_limit');
  const response = await fetchImpl(`${baseUrl}/items/chat_exchanges?${query.toString()}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus model failure aggregate failed with status ${response.status}.`);
  }
  const payload = aggregateResponseSchema.parse(await response.json());
  const row = payload.data?.[0];
  if (row === undefined) {
    return 0;
  }
  const raw = row.count?.id;
  if (raw === null || raw === undefined) {
    return 0;
  }
  if (typeof raw === 'number') {
    return raw;
  }
  return Number.parseInt(raw, 10);
}
