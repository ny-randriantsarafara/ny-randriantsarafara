import { createSign } from 'node:crypto';

import type { GoogleServiceAccount } from './service-account.ts';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export function buildSignedJwtForTest(account: GoogleServiceAccount, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SEARCH_CONSOLE_SCOPE,
      aud: account.token_uri,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
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
