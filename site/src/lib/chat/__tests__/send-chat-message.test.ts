import { activePublicationFixture } from '@portfolio/content/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendChatMessage } from '@/lib/chat/send-chat-message.ts';

const validResponse = {
  mode: 'scripted',
  publicationId: activePublicationFixture.publicationId,
  reply: {
    text: 'Hello',
    answerSlugs: ['journey'],
    blocks: [{ type: 'timeline' }],
    suggestions: ['Next?'],
    outcome: 'answered',
  },
};

describe('sendChatMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns api responses when validation succeeds', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(validResponse), { status: 200 }));
    const result = await sendChatMessage({
      locale: 'en',
      conversationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
      messages: [{ role: 'visitor', text: 'Tell me about your background' }],
      publication: activePublicationFixture,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    expect(result.kind).toBe('api');
    if (result.kind === 'api') {
      expect(result.response.reply.text).toBe('Hello');
    }
  });

  it('falls back on network errors', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await sendChatMessage({
      locale: 'en',
      conversationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
      messages: [{ role: 'visitor', text: 'Tell me about your background' }],
      publication: activePublicationFixture,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    expect(result.kind).toBe('fallback');
    if (result.kind === 'fallback') {
      expect(result.response.reply.text.length).toBeGreaterThan(0);
    }
  });

  it('falls back on invalid JSON responses', async () => {
    const fetchFn = vi.fn(async () => new Response('{not-json', { status: 200 }));
    const result = await sendChatMessage({
      locale: 'en',
      conversationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
      messages: [{ role: 'visitor', text: 'Tell me about your background' }],
      publication: activePublicationFixture,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    expect(result.kind).toBe('fallback');
  });

  it('falls back on non-2xx responses', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 503 }));
    const result = await sendChatMessage({
      locale: 'en',
      conversationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
      messages: [{ role: 'visitor', text: 'Tell me about your background' }],
      publication: activePublicationFixture,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    expect(result.kind).toBe('fallback');
  });

  it('returns aborted when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(validResponse), { status: 200 }));
    const result = await sendChatMessage({
      locale: 'en',
      conversationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
      messages: [{ role: 'visitor', text: 'Hello' }],
      publication: activePublicationFixture,
      apiUrl: 'https://api.example.com',
      fetchFn,
      signal: controller.signal,
    });
    expect(result.kind).toBe('aborted');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('falls back when the request times out', async () => {
    vi.useFakeTimers();
    const fetchFn: typeof fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal !== undefined && signal !== null) {
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError'))
            );
          }
          return undefined;
        })
    );
    const promise = sendChatMessage({
      locale: 'en',
      conversationId: '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42',
      messages: [{ role: 'visitor', text: 'Tell me about your background' }],
      publication: activePublicationFixture,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    await vi.advanceTimersByTimeAsync(12_500);
    const result = await promise;
    vi.useRealTimers();
    expect(result.kind).toBe('fallback');
  });
});
