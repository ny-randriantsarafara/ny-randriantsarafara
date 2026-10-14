import { describe, expect, it } from 'vitest';

import { DIRECTUS_ASSET_MAX_BYTES, readAssetBody } from './asset-body.ts';

function responseWithBody(body: Uint8Array, contentLength?: string): Response {
  const headers = new Headers();
  if (contentLength !== undefined) {
    headers.set('Content-Length', contentLength);
  }
  return new Response(body, { headers });
}

describe('readAssetBody', () => {
  it('rejects bodies larger than the Content-Length header', async () => {
    const result = await readAssetBody(
      responseWithBody(new Uint8Array(10), String(DIRECTUS_ASSET_MAX_BYTES + 1))
    );
    expect(result).toBeNull();
  });

  it('rejects streamed bodies above the cap', async () => {
    const chunk = new Uint8Array(DIRECTUS_ASSET_MAX_BYTES + 1);
    const result = await readAssetBody(responseWithBody(chunk));
    expect(result).toBeNull();
  });
});
