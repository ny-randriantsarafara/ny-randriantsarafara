import { createDirectus, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

import { testEnvironment } from './environment.ts';

function createTokenClient(token: string) {
  return createDirectus<PortfolioSchema>(testEnvironment.directusUrl)
    .with(staticToken(token))
    .with(rest());
}

export const adminClient = createTokenClient(testEnvironment.adminToken);
export const ownerClient = createTokenClient(testEnvironment.ownerToken);
export const assistantClient = createTokenClient(testEnvironment.assistantToken);
export const anonymousClient = createDirectus<PortfolioSchema>(testEnvironment.directusUrl).with(
  rest()
);
