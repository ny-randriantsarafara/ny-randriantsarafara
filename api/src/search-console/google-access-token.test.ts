import { generateKeyPairSync, createVerify } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { buildSignedJwtForTest } from './google-access-token.test-support.ts';
import {
  createGoogleAccessTokenClient,
  createMemoryAccessTokenCache,
} from './google-access-token.ts';

describe('Google access token JWT', () => {
  it('signs a JWT that verifies with the service account public key', () => {
    const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwt = buildSignedJwtForTest(
      {
        client_email: 'service@example.com',
        private_key: keyPair.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        token_uri: 'https://oauth2.googleapis.com/token',
      },
      1_700_000_000
    );
    const [header, payload, signature] = jwt.split('.');
    expect(header).toBeDefined();
    expect(payload).toBeDefined();
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${payload}`);
    verifier.end();
    expect(
      verifier.verify(
        keyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        signature ?? '',
        'base64url'
      )
    ).toBe(true);
  });

  it('caches access tokens until expiry', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ access_token: 'token-1', expires_in: 3600 })
    );
    const client = createGoogleAccessTokenClient({
      account: {
        client_email: 'service@example.com',
        private_key: generateKeyPairSync('rsa', { modulusLength: 2048 })
          .privateKey.export({
            type: 'pkcs1',
            format: 'pem',
          })
          .toString(),
        token_uri: 'https://oauth2.googleapis.com/token',
      },
      fetchImpl,
      cache: createMemoryAccessTokenCache(),
      clock: () => new Date('2026-10-14T12:00:00.000Z'),
    });
    await client.getAccessToken();
    await client.getAccessToken();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
