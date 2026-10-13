import { PublicationConfigurationError, PublicationHookError } from '../errors.ts';

export type HookConfiguration = { url: string; secret: string };
export type HookFetch = (url: string, init: RequestInit) => Promise<Response>;

const HOOK_TIMEOUT_SECONDS = 10;

export function readHookConfiguration(environment: Record<string, unknown>): HookConfiguration {
  return {
    url: readVariable(environment, 'PUBLICATION_HOOK_URL'),
    secret: readVariable(environment, 'PUBLICATION_HOOK_SECRET'),
  };
}

export async function notifyPublicationHook(
  configuration: HookConfiguration,
  publicationId: string,
  fetchHook: HookFetch
): Promise<void> {
  const response = await callHook(configuration, publicationId, fetchHook);
  if (!response.ok) {
    throw new PublicationHookError({
      publication: publicationId,
      reason: `HTTP ${response.status}`,
    });
  }
}

function readVariable(environment: Record<string, unknown>, name: string): string {
  const value = environment[name];
  if (typeof value !== 'string' || value === '') {
    throw new PublicationConfigurationError({ variable: name });
  }
  return value;
}

async function callHook(
  configuration: HookConfiguration,
  publicationId: string,
  fetchHook: HookFetch
): Promise<Response> {
  try {
    return await fetchHook(configuration.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicationId }),
      signal: AbortSignal.timeout(HOOK_TIMEOUT_SECONDS * 1000),
    });
  } catch (error) {
    throw new PublicationHookError({
      publication: publicationId,
      reason: describeNetworkFailure(error),
    });
  }
}

function describeNetworkFailure(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return `no answer within ${HOOK_TIMEOUT_SECONDS} s`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'network failure';
}
