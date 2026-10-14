import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ProfilePhotoManifest } from './profile-photo-manifest.ts';
import type { ActivePublication } from '@portfolio/content';

const DISPLAY_SIZE = 160;

function extensionForContentType(contentType: string): string {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized === 'image/jpeg') {
    return 'jpg';
  }
  if (normalized === 'image/webp') {
    return 'webp';
  }
  if (normalized === 'image/gif') {
    return 'gif';
  }
  return 'png';
}

export async function downloadProfilePhotoFromApi(
  apiUrl: string,
  publication: ActivePublication,
  fetchImpl: typeof fetch
): Promise<ProfilePhotoManifest | null> {
  const photo = publication.content.profile.photo;
  if (photo === null) {
    return null;
  }
  const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const response = await fetchImpl(`${base}/content/photo`);
  if (!response.ok) {
    return null;
  }
  const contentType = response.headers.get('Content-Type') ?? 'image/png';
  const extension = extensionForContentType(contentType);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const generatedDir = path.join(process.cwd(), 'public', 'generated');
  await mkdir(generatedDir, { recursive: true });
  const fileName = `profile-photo.${extension}`;
  const filePath = path.join(generatedDir, fileName);
  await writeFile(filePath, bytes);
  const contentDir = path.join(process.cwd(), 'content');
  await mkdir(contentDir, { recursive: true });
  const manifest: ProfilePhotoManifest = {
    src: `/generated/${fileName}`,
    width: DISPLAY_SIZE,
    height: DISPLAY_SIZE,
    byteLength: bytes.byteLength,
  };
  await writeFile(
    path.join(contentDir, 'profile-photo.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  return manifest;
}

export async function removeProfilePhotoArtifacts(): Promise<void> {
  const { rm } = await import('node:fs/promises');
  const manifestPath = path.join(process.cwd(), 'content', 'profile-photo.manifest.json');
  const generatedDir = path.join(process.cwd(), 'public', 'generated');
  await rm(manifestPath, { force: true });
  await rm(generatedDir, { recursive: true, force: true });
}
