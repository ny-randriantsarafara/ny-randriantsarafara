import { z } from 'zod';

export async function verifyFreeRoute(
  model: string,
  maxCalls: number,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  if (!model.endsWith(':free')) throw new Error('An exact :free route is required');
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 60)
    throw new Error('max-calls must be 1..60');
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Missing OpenRouter authentication');
  const catalogResponse = await fetchImpl('https://openrouter.ai/api/v1/models', {
    signal: AbortSignal.timeout(10000),
  });
  if (!catalogResponse.ok) throw new Error('Free-route catalog unavailable');
  const catalog = z
    .object({
      data: z.array(z.object({ id: z.string(), pricing: z.record(z.string(), z.string()) })),
    })
    .parse(await catalogResponse.json());
  const route = catalog.data.find((entry) => entry.id === model);
  if (
    !route ||
    !('prompt' in route.pricing) ||
    !('completion' in route.pricing) ||
    Object.values(route.pricing).some(
      (price) => price.trim() === '' || !Number.isFinite(Number(price)) || Number(price) !== 0
    )
  )
    throw new Error('Every advertised price category must be explicitly zero');
  const quotaResponse = await fetchImpl('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!quotaResponse.ok) throw new Error('Quota preflight unavailable');
  // USD balances are not request quotas. Require request-count evidence from the
  // authenticated preflight; responses without it fail closed.
  // https://openrouter.ai/docs/api/reference/limits
  const quota = z
    .object({
      data: z.object({
        free_model_daily_requests: z.object({
          used: z.number().int().nonnegative(),
          limit: z.number().int().nonnegative(),
          remaining: z.number().int().nonnegative(),
        }),
      }),
    })
    .safeParse(await quotaResponse.json());
  if (
    !quota.success ||
    quota.data.data.free_model_daily_requests.remaining < maxCalls ||
    quota.data.data.free_model_daily_requests.used +
      quota.data.data.free_model_daily_requests.remaining >
      quota.data.data.free_model_daily_requests.limit
  )
    throw new Error('Authenticated free request quota is unavailable or insufficient');
}
