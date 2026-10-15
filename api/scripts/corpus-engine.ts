// Isolated child process: imports the selected engine, never a shared model-output contract.
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import type { ChatModelRequest } from '../src/chat/chat-model.ts';
import { measureCompletion } from './timed-completion.ts';
import { activePublicationSchema } from '@portfolio/content';
import { chatRequestSchema } from '@portfolio/chat';

const inputSchema = z.object({
  engineDir: z.string(),
  active: activePublicationSchema,
  request: chatRequestSchema,
  model: z.string(),
  offline: z.boolean(),
  output: z.string(),
  attempt: z.number().int(),
  variant: z.string(),
  quotaWaitMs: z.number(),
});
const input = inputSchema.parse(JSON.parse(readFileSync(0, 'utf8')));
const load = (file: string) =>
  import(pathToFileURL(resolve(input.engineDir, 'api/src', file)).href);
const { createChatService } = await load('chat/chat-service.ts');
const { createScriptedMatcherCache } = await load('chat/scripted-matcher-cache.ts');
const { createMemoryRateLimiter } = await load('rate-limit/memory-rate-limiter.ts');
const { createWithinBudgetGate } = await load('budget/monthly-budget.ts');
const { createOpenAiCompatibleModel } = await load('chat/openai-compatible-model.ts');
const records: unknown[] = [];
let providerMs = 0;
let providerCalls = 0;
const fetchImpl: typeof fetch = async (url, init) => {
  providerCalls += 1;
  // Write before network, including attempts that never produce headers or usage.
  appendFileSync(
    input.output,
    JSON.stringify({
      type: 'attempt',
      variant: input.variant,
      attempt: input.attempt,
      startedAt: new Date().toISOString(),
      model: input.model,
      offline: input.offline,
    }) + '\n'
  );
  if (input.offline) throw new DOMException('Injected timeout', 'TimeoutError');
  return await fetch(url, init);
};
const transportModel = createOpenAiCompatibleModel({
  provider: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: input.offline ? 'offline-placeholder' : process.env.OPENROUTER_API_KEY,
  },
  fetchImpl,
  createAbortSignal: AbortSignal.timeout,
});
const model = {
  complete: (request: ChatModelRequest) =>
    measureCompletion(
      () => transportModel.complete(request),
      (milliseconds) => {
        providerMs += milliseconds;
      }
    ),
};
const service = createChatService({
  readActivePublication: async () => input.active,
  matcherCache: createScriptedMatcherCache(),
  modelMode: {
    model,
    dailyCallLimit: 60,
    readSettings: async () => ({
      status: 'configured',
      settings: {
        modelName: input.model,
        inputPriceEurPerMillion: 0,
        cacheReadPriceEurPerMillion: 0,
        cacheWritePriceEurPerMillion: 0,
        outputPriceEurPerMillion: 0,
        reasoningEffort: null,
        timeoutMilliseconds: 10000,
        responseCacheEnabled: false,
        maxInputBytes: 65536,
        maxOutputTokens: null,
        profileId: null,
        providerId: 'openrouter',
        configurationFingerprint: 'corpus-evaluation',
        configurationSource: 'legacy',
      },
    }),
  },
  budgetGate: createWithinBudgetGate(),
  rateLimiter: createMemoryRateLimiter(),
  exchangeRecorder: {
    record: async (record: unknown) => {
      records.push(record);
    },
  },
  clock: () => new Date(),
});
const started = performance.now();
const response = await service.handle(input.request, 'corpus-evaluation');
console.log(
  JSON.stringify({
    response,
    records,
    providerCalls,
    providerMs,
    serviceMs: performance.now() - started,
    quotaWaitMs: input.quotaWaitMs,
  })
);
