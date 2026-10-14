import {
  DIRECTUS_ASSET_MAX_BYTES,
  DIRECTUS_ASSET_TIMEOUT_MS,
  readAssetBody,
} from './asset-body.ts';

import type { ActivePublicationCache } from '../publications/active-publication-cache.ts';
import type { Log } from '../http/responses.ts';
import { describeError } from '../http/responses.ts';

export type DirectusAssetFetcher = {
  fetchAsset(fileId: string): Promise<{ body: ArrayBuffer; contentType: string } | null>;
};

export type ProfilePhotoDependencies = {
  cache: ActivePublicationCache;
  assets: DirectusAssetFetcher;
  log: Log;
};

function isImageContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return normalized.startsWith('image/');
}

export async function respondWithProfilePhoto(
  dependencies: ProfilePhotoDependencies
): Promise<Response> {
  try {
    const active = await dependencies.cache.current();
    if (active === null) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const photo = active.content.profile.photo;
    if (photo === null) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const asset = await dependencies.assets.fetchAsset(photo.fileId);
    if (asset === null) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!isImageContentType(asset.contentType)) {
      dependencies.log(`Profile photo rejected: unsupported content type ${asset.contentType}`);
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const etag = `"${photo.fileId}"`;
    return new Response(asset.body, {
      status: 200,
      headers: {
        'Content-Type': asset.contentType,
        ETag: etag,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    dependencies.log(`Profile photo unavailable: ${describeError(error)}`);
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export function createDirectusAssetFetcher(
  directusUrl: string,
  token: string,
  fetchImpl: typeof fetch
): DirectusAssetFetcher {
  const base = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;
  return {
    async fetchAsset(fileId: string) {
      const timeout = AbortSignal.timeout(DIRECTUS_ASSET_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetchImpl(`${base}/assets/${fileId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: timeout,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          throw error;
        }
        return null;
      }
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        return null;
      }
      const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
      const body = await readAssetBody(response, DIRECTUS_ASSET_MAX_BYTES);
      if (body === null) {
        return null;
      }
      return { body, contentType };
    },
  };
}
