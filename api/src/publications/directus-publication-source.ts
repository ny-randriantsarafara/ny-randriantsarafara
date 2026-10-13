import { createDirectus, readItems, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import {
  activePublicationSchema,
  type ActivePublication,
  validatePublicationContent,
} from '@portfolio/content';
import { z } from 'zod';

import { PublicationSourceError, type PublicationSource } from './publication-source.ts';

const publicationRowSchema = z.object({
  id: z.uuid(),
  content: z.unknown(),
  activated_at: z.string().nullable(),
});

const directusRejectionSchema = z.object({
  errors: z.array(z.object({ message: z.string() })).min(1),
});

type PublicationRow = z.infer<typeof publicationRowSchema>;

function directusClientGlobals() {
  return {
    fetch: globalThis.fetch,
    WebSocket: globalThis.WebSocket,
    URL: globalThis.URL,
    logger: globalThis.console,
  };
}

export function createDirectusPublicationSource(url: string, token: string): PublicationSource {
  const client = createDirectus<PortfolioSchema>(url, { globals: directusClientGlobals() })
    .with(staticToken(token))
    .with(rest());

  return {
    readActive: async () => {
      const rows = await requestFromDirectus(
        client.request(
          readItems('publications', {
            filter: { status: { _eq: 'active' } },
            fields: ['id', 'content', 'activated_at'],
            limit: 2,
          })
        )
      );
      if (rows.length === 0) {
        return null;
      }
      if (rows.length > 1) {
        throw new PublicationSourceError('Several publications are active');
      }
      const parsedRow = publicationRowSchema.safeParse(rows[0]);
      if (!parsedRow.success) {
        throw new PublicationSourceError(
          `Invalid publication row (${formatZodIssuePaths(parsedRow.error)})`
        );
      }
      return toActivePublication(parsedRow.data);
    },
    ping: async () => pingDirectus(url),
  };
}

export function toActivePublication(row: PublicationRow): ActivePublication {
  if (row.activated_at === null) {
    throw new PublicationSourceError('The active publication has no activation timestamp');
  }
  const validation = validatePublicationContent(row.content);
  if (!validation.valid) {
    const summary = validation.problems
      .slice(0, 5)
      .map((problem) => `${problem.path}: ${problem.message}`)
      .join('; ');
    throw new PublicationSourceError(`Invalid publication content (${summary})`);
  }
  const parsedPublication = activePublicationSchema.safeParse({
    publicationId: row.id,
    activatedAt: row.activated_at,
    content: validation.content,
  });
  if (!parsedPublication.success) {
    throw new PublicationSourceError(
      `Invalid active publication (${formatZodIssuePaths(parsedPublication.error)})`
    );
  }
  return parsedPublication.data;
}

async function requestFromDirectus<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    throw new PublicationSourceError(`Directus request failed: ${describeRejection(error)}`);
  }
}

function describeRejection(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  const directusRejection = directusRejectionSchema.safeParse(error);
  if (directusRejection.success) {
    const firstError = directusRejection.data.errors.at(0);
    if (firstError !== undefined) {
      return firstError.message;
    }
  }
  return String(error);
}

function formatZodIssuePaths(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length === 0 ? '(root)' : issue.path.join('.')))
    .join('; ');
}

async function pingDirectus(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/server/ping`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}
