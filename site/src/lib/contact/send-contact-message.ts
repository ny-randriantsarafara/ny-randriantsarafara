import { defaultApiUrl } from '@/lib/seo/content-security-policy.ts';

import type { ContactFormPayload } from '@/lib/contact/contact-request.ts';

const CONTACT_TIMEOUT_MS = 12_000;

function contactEndpoint(apiUrl: string): string {
  const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  return `${base}/contact`;
}

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorCode(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const error = body.error;
  if (typeof error === 'string') {
    return error;
  }
  return null;
}

export type SendContactResult =
  | { kind: 'sent' }
  | { kind: 'rate_limited' }
  | { kind: 'invalid' }
  | { kind: 'failed' };

export type SendContactInput = {
  payload: ContactFormPayload;
  apiUrl?: string;
  fetchFn?: typeof fetch;
};

export async function sendContactMessage(input: SendContactInput): Promise<SendContactResult> {
  const fetchImpl = input.fetchFn ?? fetch;
  const apiUrl = input.apiUrl ?? defaultApiUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(contactEndpoint(apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.payload),
      signal: controller.signal,
    });
    if (response.status === 200) {
      return { kind: 'sent' };
    }
    if (response.status === 429) {
      return { kind: 'rate_limited' };
    }
    if (response.status === 400) {
      return { kind: 'invalid' };
    }
    const raw = parseJson(await response.text());
    const code = readErrorCode(raw);
    if (code === 'rate_limited') {
      return { kind: 'rate_limited' };
    }
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  } finally {
    clearTimeout(timeout);
  }
}
