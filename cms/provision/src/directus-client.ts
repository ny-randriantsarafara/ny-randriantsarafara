import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

export type Log = (message: string) => void;

export function createAdminClient(url: string, token: string) {
  return createDirectus<PortfolioSchema>(url).with(staticToken(token)).with(rest());
}

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createSystemAdminClient(url: string, token: string) {
  return createDirectus(url).with(staticToken(token)).with(rest());
}

export type SystemAdminClient = ReturnType<typeof createSystemAdminClient>;
