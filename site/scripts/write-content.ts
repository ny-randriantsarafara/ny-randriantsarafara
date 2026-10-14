import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { initialContent } from '@portfolio/cms-provision/seed';

import { fetchActivePublication, seedPublication } from '../src/lib/publication/content-source.ts';
import {
  downloadProfilePhotoFromApi,
  removeProfilePhotoArtifacts,
} from '../src/lib/publication/download-profile-photo.ts';
import { parseActivePublication } from '../src/lib/publication/parse-publication.ts';

const outputPath = path.join(process.cwd(), 'content', 'publication.json');

async function writePublication(
  publication: unknown
): Promise<ReturnType<typeof parseActivePublication>> {
  const validated = parseActivePublication(publication);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  return validated;
}

async function syncProfilePhoto(
  publication: ReturnType<typeof parseActivePublication>,
  apiUrl: string | null
): Promise<void> {
  if (publication.content.profile.photo === null) {
    await removeProfilePhotoArtifacts();
    return;
  }
  if (apiUrl === null) {
    await removeProfilePhotoArtifacts();
    return;
  }
  await downloadProfilePhotoFromApi(apiUrl, publication, fetch);
}

async function runSeed(): Promise<void> {
  const publication = await writePublication(seedPublication(initialContent));
  await syncProfilePhoto(publication, null);
}

async function runPull(): Promise<void> {
  const apiUrl = process.env.CONTENT_API_URL;
  if (!apiUrl) {
    throw new Error('CONTENT_API_URL is required for content:pull');
  }
  const json = await fetchActivePublication(apiUrl, fetch);
  const publication = await writePublication(json);
  await syncProfilePhoto(publication, apiUrl);
}

const mode = process.argv[2];
if (mode === '--seed') {
  await runSeed();
} else if (mode === '--api') {
  await runPull();
} else {
  throw new Error('Usage: node scripts/write-content.ts --seed | --api');
}
