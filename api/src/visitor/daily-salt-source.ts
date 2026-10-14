import { createItem, createDirectus, readItems, rest, staticToken } from '@directus/sdk';
import { randomBytes } from 'node:crypto';

import { parisDayKey } from '../time/paris-calendar.ts';

export type DailySaltSource = {
  currentSalt(): Promise<Buffer>;
};

export type DailySaltSourceDependencies = {
  directusUrl: string;
  apiToken: string;
  clock: () => Date;
  log: (message: string) => void;
};

type VisitorSaltSchema = {
  visitor_salts: { id: string; day: string; salt: string }[];
};

type SaltCache = {
  day: string | null;
  salt: Buffer | null;
};

function createSaltClient(directusUrl: string, apiToken: string) {
  return createDirectus<VisitorSaltSchema>(directusUrl, {
    globals: {
      fetch: globalThis.fetch,
      WebSocket: globalThis.WebSocket,
      URL: globalThis.URL,
      logger: globalThis.console,
    },
  })
    .with(staticToken(apiToken))
    .with(rest());
}

type SaltDirectusClient = ReturnType<typeof createSaltClient>;

export function createDirectusDailySaltSource(
  dependencies: DailySaltSourceDependencies
): DailySaltSource {
  const client = createSaltClient(dependencies.directusUrl, dependencies.apiToken);
  const cache: SaltCache = { day: null, salt: null };

  return {
    currentSalt: async () => {
      const day = parisDayKey(dependencies.clock);
      if (cache.day === day && cache.salt !== null) {
        return cache.salt;
      }
      const salt = await readOrCreateSaltForDay(client, day, dependencies.log);
      cache.day = day;
      cache.salt = salt;
      return salt;
    },
  };
}

async function readOrCreateSaltForDay(
  client: SaltDirectusClient,
  day: string,
  log: (message: string) => void
): Promise<Buffer> {
  const existing = await readSaltHex(client, day);
  if (existing !== null) {
    return Buffer.from(existing, 'hex');
  }
  const saltHex = randomBytes(32).toString('hex');
  try {
    await client.request(createItem('visitor_salts', { day, salt: saltHex }));
  } catch (error) {
    const recovered = await readSaltHex(client, day);
    if (recovered !== null) {
      return Buffer.from(recovered, 'hex');
    }
    log(`Visitor salt creation failed: ${describeError(error)}`);
    throw error;
  }
  return Buffer.from(saltHex, 'hex');
}

async function readSaltHex(client: SaltDirectusClient, day: string): Promise<string | null> {
  const rows = await client.request(
    readItems('visitor_salts', {
      filter: { day: { _eq: day } },
      fields: ['salt'],
      limit: 1,
    })
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return row.salt;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
