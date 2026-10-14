import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createOpenAiCompatibleModel } from './openai-compatible-model.ts';

const fetchInitSchema = z.object({
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});

const configuration = {
  baseUrl: 'https://api.example/v1',
  apiKey: 'secret-key',
  modelName: 'test-model',
  inputPriceEurPerMillion: 1,
  outputPriceEurPerMillion: 2,
  monthlyBudgetEur: 5,
  dailyCallLimit: 10,
};

describe('createOpenAiCompatibleModel', () => {
  it('posts a json_schema completion with bearer auth', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content:
                '{"outcome":"unknown","text":"x","answerSlugs":[],"blocks":[],"suggestions":["a","b"],"sensitiveTopicSlug":null}',
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      })
    );
    const model = createOpenAiCompatibleModel({
      configuration,
      fetchImpl,
      createAbortSignal: () => new AbortController().signal,
    });

    await model.complete('prompt');

    expect(fetchImpl).toHaveBeenCalledOnce();
    const firstCall = fetchImpl.mock.calls.at(0);
    if (firstCall === undefined) {
      throw new Error('Expected a fetch call.');
    }
    const url = firstCall.at(0);
    const init = fetchInitSchema.parse(firstCall.at(1));
    expect(url).toBe('https://api.example/v1/chat/completions');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer secret-key');
    const body = JSON.parse(init.body);
    expect(body.response_format.type).toBe('json_schema');
  });

  it('maps HTTP errors to a failure status', async () => {
    const model = createOpenAiCompatibleModel({
      configuration,
      fetchImpl: async () => new Response('error', { status: 502 }),
      createAbortSignal: () => new AbortController().signal,
    });

    const result = await model.complete('prompt');
    expect(result.status).toBe('http');
    if (result.status === 'http') {
      expect(result.statusCode).toBe(502);
    }
  });

  it('maps abort errors to model_timeout', async () => {
    const model = createOpenAiCompatibleModel({
      configuration,
      fetchImpl: async () =>
        Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      createAbortSignal: () => new AbortController().signal,
    });

    expect(await model.complete('prompt')).toEqual({ status: 'timeout' });
  });

  it('maps an elapsed AbortSignal.timeout to model_timeout', async () => {
    const model = createOpenAiCompatibleModel({
      configuration,
      fetchImpl: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => reject(signal.reason));
        }),
      createAbortSignal: () => AbortSignal.timeout(1),
    });

    expect(await model.complete('prompt')).toEqual({ status: 'timeout' });
  });

  it('parses token usage from the provider payload', async () => {
    const model = createOpenAiCompatibleModel({
      configuration,
      fetchImpl: async () =>
        Response.json({
          choices: [
            {
              message: {
                content:
                  '{"outcome":"unknown","text":"x","answerSlugs":[],"blocks":[],"suggestions":["a","b"],"sensitiveTopicSlug":null}',
              },
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 3 },
        }),
      createAbortSignal: () => new AbortController().signal,
    });

    const result = await model.complete('prompt');
    if (result.status !== 'ok') {
      throw new Error('Expected a successful model response.');
    }
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 3 });
  });
});
