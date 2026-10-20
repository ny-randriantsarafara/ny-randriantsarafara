import {
  CHAT_CLIENT_TIMEOUT_MILLISECONDS,
  chatResponseSchema,
  degradedReply,
} from '@portfolio/chat';

import { trimChatHistory } from '@/lib/chat/chat-history.ts';
import { matchScriptedReply } from '@/lib/chat/scripted-response.ts';
import { defaultApiUrl } from '@/lib/seo/content-security-policy.ts';

import type { HistoryMessage } from '@/lib/chat/chat-history.ts';
import type { ChatRequest, ChatResponse } from '@portfolio/chat';
import type { ActivePublication, Locale } from '@portfolio/content';

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

type ChatResponseRead =
  | { status: 'ok'; response: ChatResponse }
  | { status: Extract<ChatTransportFailure, 'http' | 'contract'> };

// Reading the body can still time out or lose the network: those errors reach the caller.
async function readChatResponse(response: Response): Promise<ChatResponseRead> {
  if (!response.ok) {
    return { status: 'http' };
  }
  const parsed = chatResponseSchema.safeParse(parseJson(await response.text()));
  if (!parsed.success) {
    return { status: 'contract' };
  }
  return { status: 'ok', response: parsed.data };
}

// The same rule as the API without a model: a published answer the question points to, else an
// unavailability notice rather than a guess or a claim that the information is missing.
function degradedResponse(
  input: SendChatMessageInput,
  failure: ChatTransportFailure
): SendChatMessageResult {
  const scripted = matchScriptedReply(input.publication, input.locale, input.messages);
  return {
    kind: 'fallback',
    failure,
    response: {
      mode: 'scripted',
      publicationId: input.publication.publicationId,
      reply: degradedReply(scripted, input.publication.content, input.locale),
    },
  };
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

export type ChatTransportFailure = 'network' | 'timeout' | 'http' | 'contract';

export type SendChatMessageResult =
  | { kind: 'api'; response: ChatResponse }
  | { kind: 'fallback'; failure: ChatTransportFailure; response: ChatResponse }
  | { kind: 'aborted' };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
  const fetchImpl = input.fetchFn ?? fetch;
  const apiUrl = input.apiUrl ?? defaultApiUrl();
  if (input.signal?.aborted === true) {
    return { kind: 'aborted' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MILLISECONDS);
  let abortedByCaller = false;
  const externalSignal = input.signal;
  if (externalSignal !== undefined) {
    externalSignal.addEventListener(
      'abort',
      () => {
        abortedByCaller = true;
        controller.abort();
      },
      { once: true }
    );
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
    if (parsed.status !== 'ok') {
      return degradedResponse(input, parsed.status);
    }
    return { kind: 'api', response: parsed.response };
  } catch (error) {
    if (abortedByCaller) {
      return { kind: 'aborted' };
    }
    if (isAbortError(error)) {
      return degradedResponse(input, 'timeout');
    }
    return degradedResponse(input, 'network');
  } finally {
    clearTimeout(timeout);
  }
}
