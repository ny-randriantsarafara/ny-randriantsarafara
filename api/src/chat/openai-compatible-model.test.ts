import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ChatModelRequest } from './chat-model.ts';
import { modelJsonSchema } from './model-output-schema.ts';
import { createOpenAiCompatibleModel } from './openai-compatible-model.ts';

const fetchInitSchema = z.object({
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});

const provider = {
  baseUrl: 'https://api.example/v1',
  apiKey: 'secret-key',
};

const request: ChatModelRequest = {
  instructions: 'rules and knowledge',
  prompt: 'prompt',
  sessionId: '00000000-0000-4000-8000-000000000010',
  modelName: 'test-model',
  reasoningEffort: null,
  timeoutMilliseconds: 10_000,
};

function completionWithUsage(usage: object) {
  return Response.json({
    choices: [
      {
        message: {
          content:
            '{"outcome":"unknown","text":"x","answerSlugs":[],"blocks":[],"suggestions":["a","b"],"sensitiveTopicSlug":null}',
        },
      },
    ],
    usage,
  });
}

describe('createOpenAiCompatibleModel', () => {
  it('posts a json_schema completion for the requested model with bearer auth', async () => {
    const fetchImpl = vi.fn(async () =>
      completionWithUsage({ prompt_tokens: 10, completion_tokens: 5 })
    );
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl,
      createAbortSignal: () => new AbortController().signal,
    });

    await model.complete({
      ...request,
      outputSchema: { ...modelJsonSchema, title: 'publication-schema' },
    });

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
    expect(body.model).toBe('test-model');
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.schema.title).toBe('publication-schema');
    expect(body.messages[1]).toEqual({ role: 'user', content: request.prompt });
    const blocks = body.response_format.json_schema.schema.properties.blocks;
    expect(blocks.items.anyOf).toHaveLength(8);
    for (const variant of blocks.items.anyOf) {
      expect(variant.additionalProperties).toBe(false);
      expect(variant.required.sort()).toEqual(Object.keys(variant.properties).sort());
    }
  });

  it('marks the instructions for prompt caching and pins the conversation to one provider', async () => {
    const fetchImpl = vi.fn(async () =>
      completionWithUsage({ prompt_tokens: 10, completion_tokens: 5 })
    );
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl,
      createAbortSignal: () => new AbortController().signal,
    });

    await model.complete(request);

    const init = fetchInitSchema.parse(fetchImpl.mock.calls.at(0)?.at(1));
    const body = JSON.parse(init.body);
    expect(body.session_id).toBe(request.sessionId);
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: [{ type: 'text', text: request.instructions, cache_control: { type: 'ephemeral' } }],
    });
  });

  it('asks for the reasoning effort chosen in the CMS', async () => {
    const fetchImpl = vi.fn(async () =>
      completionWithUsage({ prompt_tokens: 10, completion_tokens: 5 })
    );
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl,
      createAbortSignal: () => new AbortController().signal,
    });

    await model.complete({ ...request, reasoningEffort: 'none' });

    const init = fetchInitSchema.parse(fetchImpl.mock.calls.at(0)?.at(1));
    expect(JSON.parse(init.body).reasoning).toEqual({ effort: 'none' });
  });

  it('leaves the reasoning to the model without a chosen effort', async () => {
    const fetchImpl = vi.fn(async () =>
      completionWithUsage({ prompt_tokens: 10, completion_tokens: 5 })
    );
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl,
      createAbortSignal: () => new AbortController().signal,
    });

    await model.complete(request);

    const init = fetchInitSchema.parse(fetchImpl.mock.calls.at(0)?.at(1));
    expect(JSON.parse(init.body)).not.toHaveProperty('reasoning');
  });

  it('waits for the requested timeout', async () => {
    const createAbortSignal = vi.fn<(timeoutMilliseconds: number) => AbortSignal>(
      () => new AbortController().signal
    );
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl: async () => new Response('error', { status: 502 }),
      createAbortSignal,
    });

    await model.complete({ ...request, timeoutMilliseconds: 4_000 });

    expect(createAbortSignal).toHaveBeenCalledWith(4_000);
  });

  it('maps HTTP errors to a failure status', async () => {
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl: async () => new Response('error', { status: 502 }),
      createAbortSignal: () => new AbortController().signal,
    });

    const result = await model.complete(request);
    expect(result.status).toBe('http');
    if (result.status === 'http') {
      expect(result.statusCode).toBe(502);
    }
  });

  it('maps abort errors to model_timeout', async () => {
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl: async () =>
        Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      createAbortSignal: () => new AbortController().signal,
    });

    expect(await model.complete(request)).toEqual({ status: 'timeout' });
  });

  it('maps an elapsed AbortSignal.timeout to model_timeout', async () => {
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => reject(signal.reason));
        }),
      createAbortSignal: () => AbortSignal.timeout(1),
    });

    expect(await model.complete(request)).toEqual({ status: 'timeout' });
  });

  it('parses token usage from the provider payload', async () => {
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl: async () => completionWithUsage({ prompt_tokens: 12, completion_tokens: 3 }),
      createAbortSignal: () => new AbortController().signal,
    });

    const result = await model.complete(request);
    if (result.status !== 'ok') {
      throw new Error('Expected a successful model response.');
    }
    expect(result.usage).toEqual({
      inputTokens: 12,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 3,
    });
  });

  it('parses the input tokens read from and written to the prompt cache', async () => {
    const model = createOpenAiCompatibleModel({
      provider,
      fetchImpl: async () =>
        completionWithUsage({
          prompt_tokens: 15_400,
          completion_tokens: 600,
          prompt_tokens_details: { cached_tokens: 15_000, cache_write_tokens: 300 },
        }),
      createAbortSignal: () => new AbortController().signal,
    });

    const result = await model.complete(request);
    if (result.status !== 'ok') {
      throw new Error('Expected a successful model response.');
    }
    expect(result.usage).toEqual({
      inputTokens: 15_400,
      cacheReadTokens: 15_000,
      cacheWriteTokens: 300,
      outputTokens: 600,
    });
  });
});
