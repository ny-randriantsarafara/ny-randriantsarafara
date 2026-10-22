import { defineEndpoint } from '@directus/extensions-sdk';

import { readAnalyticsRoleIds } from '../auth/roles.ts';
import { requireAnalyticsDatabase } from '../query/analytics-database.ts';
import { AnalyticsDataService } from '../query/analytics-data-service.ts';
import { defaultAnalyticsEndpointDeps, registerPortfolioAnalyticsRoutes } from './router.ts';

export default defineEndpoint((router, context) => {
  const roles = readAnalyticsRoleIds(context.env);
  const service = new AnalyticsDataService(requireAnalyticsDatabase(context.database));
  const deps = defaultAnalyticsEndpointDeps(service, roles);
  registerPortfolioAnalyticsRoutes(router, deps);
});
