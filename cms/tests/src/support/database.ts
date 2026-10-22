import knex, { type Knex } from 'knex';

import { requireEnvironment } from './environment.ts';

export function createIntegrationDatabase(): Knex {
  const password = requireEnvironment('POSTGRES_PASSWORD');
  const port = process.env.CMS_TEST_DB_PORT ?? '5433';
  return knex({
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: Number.parseInt(port, 10),
      user: 'directus',
      password,
      database: 'directus',
    },
  });
}
