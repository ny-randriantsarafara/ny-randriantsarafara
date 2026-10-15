import { readFileSync } from 'node:fs';
import { z } from 'zod';

const path = process.argv[2];
if (!path) throw new Error('Provide the JSONL trace path');
const entrySchema = z.object({
  type: z.string(),
  variant: z.string().optional(),
  result: z
    .object({
      serviceMs: z.number(),
      providerMs: z.number(),
      quotaWaitMs: z.number(),
      providerCalls: z.number(),
      response: z.object({
        status: z.number(),
        body: z.object({
          mode: z.string().optional(),
          reply: z.object({ outcome: z.string() }).optional(),
        }),
      }),
      records: z.array(
        z.object({
          inputTokens: z.number().nullable().optional(),
          outputTokens: z.number().nullable().optional(),
          cacheReadTokens: z.number().nullable().optional(),
          cacheWriteTokens: z.number().nullable().optional(),
          costEur: z.number().nullable().optional(),
          providerCostUsd: z.number().nullable().optional(),
          failureReason: z.string().nullable().optional(),
        })
      ),
    })
    .optional(),
});
const entries = readFileSync(path, 'utf8')
  .trim()
  .split('\n')
  .map((line) => entrySchema.parse(JSON.parse(line)));
const percentile = (values: number[], quantile: number) =>
  [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * quantile) - 1)] ?? null;
for (const variant of new Set(
  entries.filter((entry) => entry.type === 'result').map((entry) => entry.variant)
)) {
  const results = entries
    .filter((entry) => entry.type === 'result' && entry.variant === variant)
    .flatMap((entry) => (entry.result ? [entry.result] : []));
  const records = results.flatMap((result) => result.records);
  const totals = (
    field:
      | 'inputTokens'
      | 'outputTokens'
      | 'cacheReadTokens'
      | 'cacheWriteTokens'
      | 'costEur'
      | 'providerCostUsd'
  ) => {
    const known = records.flatMap((record) =>
      typeof record[field] === 'number' ? [record[field]] : []
    );
    return {
      knownTotal: known.reduce((sum, value) => sum + value, 0),
      knownRecords: known.length,
      unknownRecords: records.length - known.length,
    };
  };
  console.log(
    JSON.stringify({
      variant,
      count: results.length,
      providerCalls: results.reduce((sum, result) => sum + result.providerCalls, 0),
      fallbackCount: results.filter((result) => result.response.body.mode !== 'model').length,
      timeoutCount: records.filter((record) => record.failureReason === 'model_timeout').length,
      serviceMs: {
        p50: percentile(
          results.map((result) => result.serviceMs),
          0.5
        ),
        p95: percentile(
          results.map((result) => result.serviceMs),
          0.95
        ),
      },
      providerMs: {
        p50: percentile(
          results.map((result) => result.providerMs),
          0.5
        ),
        p95: percentile(
          results.map((result) => result.providerMs),
          0.95
        ),
      },
      quotaWaitMs: results.reduce((sum, result) => sum + result.quotaWaitMs, 0),
      inputTokens: totals('inputTokens'),
      outputTokens: totals('outputTokens'),
      cacheReadTokens: totals('cacheReadTokens'),
      cacheWriteTokens: totals('cacheWriteTokens'),
      cmsEstimatedEur: totals('costEur'),
      providerBilledUsd: totals('providerCostUsd'),
      validResponseCost: 'pending human fidelity review',
    })
  );
}
