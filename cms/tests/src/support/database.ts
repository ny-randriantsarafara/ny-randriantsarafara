import knex, { type Knex } from 'knex';

import { requireEnvironment } from './environment.ts';

/** Connects to the stack's Postgres; a schema name scopes unqualified tables to that schema. */
export function createIntegrationDatabase(schema?: string): Knex {
  const password = requireEnvironment('POSTGRES_PASSWORD');
  const port = process.env.CMS_TEST_DB_PORT ?? '5433';
  const connection = {
    host: '127.0.0.1',
    port: Number.parseInt(port, 10),
    user: 'directus',
    password,
    database: 'directus',
  };
  if (schema === undefined) {
    return knex({ client: 'pg', connection });
  }
  return knex({ client: 'pg', connection, searchPath: [schema] });
}
