import knex, { type Knex } from 'knex';

import type { DatabaseEnvironment } from './environment.ts';

export function createProvisionDatabase(environment: DatabaseEnvironment): Knex {
  return knex({
    client: 'pg',
    connection: {
      host: environment.host,
      port: environment.port,
      user: 'directus',
      password: environment.password,
      database: 'directus',
    },
    pool: { min: 0, max: 1 },
  });
}
