import { createSign } from 'node:crypto';

import type { GoogleServiceAccount } from './service-account.ts';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_LIFETIME_SECONDS = 3_600;

export type AccessTokenCache = {
  readAccessToken(nowSeconds: number): string | null;
  storeAccessToken(token: string, expiresAtSeconds: number): void;
};

export type GoogleAccessTokenClient = {
  getAccessToken(): Promise<string>;
};

export type GoogleAccessTokenDependencies = {
  account: GoogleServiceAccount;
  fetchImpl: typeof fetch;
  cache: AccessTokenCache;
  clock: () => Date;
};

export function createGoogleAccessTokenClient(
  dependencies: GoogleAccessTokenDependencies
): GoogleAccessTokenClient {
  return {
    getAccessToken: () => fetchAccessToken(dependencies),
  };
}

async function fetchAccessToken(dependencies: GoogleAccessTokenDependencies): Promise<string> {
  const nowSeconds = Math.floor(dependencies.clock().getTime() / 1000);
  const cached = dependencies.cache.readAccessToken(nowSeconds);
  if (cached !== null) {
    return cached;
  }
  const assertion = buildSignedJwt(dependencies.account, nowSeconds);
  const response = await dependencies.fetchImpl(dependencies.account.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}.`);
  }
  const payload = await readTokenPayload(response);
  dependencies.cache.storeAccessToken(payload.accessToken, nowSeconds + payload.expiresInSeconds);
  return payload.accessToken;
}

function buildSignedJwt(account: GoogleServiceAccount, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SEARCH_CONSOLE_SCOPE,
      aud: account.token_uri,
      iat: nowSeconds,
      exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    })
  );
  const signingInput = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(account.private_key, 'base64url');
  return `${signingInput}.${signature}`;
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

async function readTokenPayload(
  response: Response
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const body: unknown = await response.json();
  if (!isRecord(body)) {
    throw new Error('Google token response was not an object.');
  }
  const accessToken = body.access_token;
  const expiresIn = body.expires_in;
  if (typeof accessToken !== 'string' || typeof expiresIn !== 'number') {
    throw new Error('Google token response was missing fields.');
  }
  return { accessToken, expiresInSeconds: expiresIn };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createMemoryAccessTokenCache(): AccessTokenCache {
  const state: { token: string | null; expiresAtSeconds: number } = {
    token: null,
    expiresAtSeconds: 0,
  };
  return {
    readAccessToken: (nowSeconds) => {
      if (state.token === null || nowSeconds >= state.expiresAtSeconds) {
        return null;
      }
      return state.token;
    },
    storeAccessToken: (token, expiresAtSeconds) => {
      state.token = token;
      state.expiresAtSeconds = expiresAtSeconds;
    },
  };
}
