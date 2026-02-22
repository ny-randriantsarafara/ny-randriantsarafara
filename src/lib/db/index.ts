import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

let instance: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    instance = drizzle(url, { schema });
  }
  return instance;
}
