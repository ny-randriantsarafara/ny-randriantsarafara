import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  activePublicationSchema,
  validatePublicationContent,
  type ActivePublication,
} from '@portfolio/content';

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function formatSchemaPaths(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>): string {
  return issues
    .map((issue) => {
      const segments = issue.path.map(String);
      return segments.length > 0 ? segments.join('.') : '(root)';
    })
    .join(', ');
}

export function parseActivePublication(json: unknown): ActivePublication {
  const parsed = activePublicationSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid publication: ${formatSchemaPaths(parsed.error.issues)}`);
  }
  const validation = validatePublicationContent(parsed.data.content);
  if (!validation.valid) {
    const paths = validation.problems.map((problem) => problem.path);
    throw new Error(`Invalid publication content: ${paths.join(', ')}`);
  }
  return parsed.data;
}

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
