import { chatResponseSchema } from '@portfolio/chat';

import { trimChatHistory } from '@/lib/chat/chat-history.ts';
import { buildScriptedChatResponse } from '@/lib/chat/scripted-response.ts';
import { defaultApiUrl } from '@/lib/seo/content-security-policy.ts';

import type { HistoryMessage } from '@/lib/chat/chat-history.ts';
import type { ChatRequest, ChatResponse } from '@portfolio/chat';
import type { ActivePublication, Locale } from '@portfolio/content';

const CHAT_TIMEOUT_MS = 12_000;

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function chatEndpoint(apiUrl: string): string {
  const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  return `${base}/chat`;
}

function buildRequest(
  locale: Locale,
  conversationId: string,
  messages: readonly HistoryMessage[]
): ChatRequest {
  return {
    locale,
    conversationId,
    messages: trimChatHistory(messages),
  };
}

async function readChatResponse(response: Response): Promise<ChatResponse | null> {
  if (!response.ok) {
    return null;
  }
  const raw = parseJson(await response.text());
  const parsed = chatResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export type SendChatMessageInput = {
  locale: Locale;
  conversationId: string;
  messages: readonly HistoryMessage[];
  publication: ActivePublication;
  apiUrl?: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
};

export type SendChatMessageResult =
  | { kind: 'api'; response: ChatResponse }
  | { kind: 'fallback'; response: ChatResponse };

export async function sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
  const fetchImpl = input.fetchFn ?? fetch;
  const apiUrl = input.apiUrl ?? defaultApiUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  const externalSignal = input.signal;
  if (externalSignal !== undefined) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const body = JSON.stringify(buildRequest(input.locale, input.conversationId, input.messages));

  try {
    const response = await fetchImpl(chatEndpoint(apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    const parsed = await readChatResponse(response);
    if (parsed === null) {
      return {
        kind: 'fallback',
        response: buildScriptedChatResponse(input.publication, input.locale, input.messages),
      };
    }
    return { kind: 'api', response: parsed };
  } catch {
    return {
      kind: 'fallback',
      response: buildScriptedChatResponse(input.publication, input.locale, input.messages),
    };
  } finally {
    clearTimeout(timeout);
  }
}
