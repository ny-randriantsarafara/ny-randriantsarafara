import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { initialContent } from '@portfolio/cms-provision/seed';

import { fetchActivePublication, seedPublication } from '../src/lib/publication/content-source.ts';
import { parseActivePublication } from '../src/lib/publication/read-publication.ts';

const outputPath = path.join(process.cwd(), 'content', 'publication.json');

async function writePublication(publication: unknown): Promise<void> {
  const validated = parseActivePublication(publication);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
}

async function runSeed(): Promise<void> {
  await writePublication(seedPublication(initialContent));
}

async function runPull(): Promise<void> {
  const apiUrl = process.env.CONTENT_API_URL;
  if (!apiUrl) {
    throw new Error('CONTENT_API_URL is required for content:pull');
  }
  const json = await fetchActivePublication(apiUrl, fetch);
  await writePublication(json);
}

const mode = process.argv[2];
if (mode === '--seed') {
  await runSeed();
} else if (mode === '--api') {
  await runPull();
} else {
  throw new Error('Usage: node scripts/write-content.ts --seed | --api');
}
