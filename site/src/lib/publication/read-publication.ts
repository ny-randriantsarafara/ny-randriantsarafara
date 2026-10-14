import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parseActivePublication } from '@/lib/publication/parse-publication.ts';

import type { ActivePublication } from '@portfolio/content';

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

export { parseActivePublication } from '@/lib/publication/parse-publication.ts';

export function readPublicationFile(filePath: string): ActivePublication {
  if (!existsSync(filePath)) {
    throw new Error(
      `No publication at ${filePath}: run \`pnpm content:seed\` or \`pnpm content:pull\`.`
    );
  }
  const raw = parseJson(readFileSync(filePath, 'utf8'));
  return parseActivePublication(raw);
}

export function readPublication(): ActivePublication {
  return readPublicationFile(path.join(process.cwd(), 'content', 'publication.json'));
}
