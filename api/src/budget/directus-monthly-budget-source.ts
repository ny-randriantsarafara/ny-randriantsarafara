export type DirectusMonthlyBudgetSource = {
  sumMonthToDateCostEur(monthStartIso: string): Promise<number>;
};

import { z } from 'zod';

const aggregateResponseSchema = z.object({
  data: z
    .array(
      z.object({
        sum: z
          .object({
            cost_eur: z.union([z.string(), z.number(), z.null()]).optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

export function createDirectusMonthlyBudgetSource(
  directusUrl: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch
): DirectusMonthlyBudgetSource {
  const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;

  return {
    async sumMonthToDateCostEur(monthStartIso: string): Promise<number> {
      const query = new URLSearchParams();
      query.set('aggregate[sum]', 'cost_eur');
      query.set('filter[date_created][_gte]', monthStartIso);
      const response = await fetchImpl(`${baseUrl}/items/chat_exchanges?${query.toString()}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!response.ok) {
        throw new Error(`Directus aggregate failed with status ${response.status}.`);
      }
      const payload = aggregateResponseSchema.parse(await response.json());
      const row = payload.data?.[0];
      if (row === undefined) {
        return 0;
      }
      const raw = row.sum?.cost_eur;
      if (raw === null || raw === undefined) {
        return 0;
      }
      if (typeof raw === 'number') {
        return raw;
      }
      return Number.parseFloat(raw);
    },
  };
}
