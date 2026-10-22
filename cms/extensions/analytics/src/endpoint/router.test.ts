import { ForbiddenError } from '@directus/errors';
import express from 'express';
import { describe, expect, it } from 'vitest';

import { assertReadAccess } from '../auth/access-guards.ts';
import type { AnalyticsRoleIds } from '../auth/roles.ts';
import {
  defaultAnalyticsEndpointDeps,
  registerPortfolioAnalyticsRoutes,
  type AnalyticsQueryService,
} from './router.ts';

const roles: AnalyticsRoleIds = {
  ownerRoleId: 'owner-role',
  assistantRoleId: 'assistant-role',
  apiServiceRoleId: 'api-role',
};

const emptyRollup = {
  day: 'window',
  visitors: 0,
  visitor_days: 0,
  page_views: 0,
  conversations: 0,
  model_exchanges: 0,
  scripted_exchanges: 0,
  outcome_answered: 0,
  outcome_unknown: 0,
  outcome_sensitive: 0,
  outcome_refused: 0,
  contact_stored: 0,
  cv_link_clicks: 0,
  content_impressions: 0,
  chat_submitted: 0,
  chat_rendered: 0,
  cache_deliveries: 0,
  generation_attempts: 0,
  generations_known_cost: 0,
  generations_unknown_cost: 0,
  model_cost_eur: 0,
  rollup_coverage: { events: 0, chat_exchanges: 0, model_generations: 0 },
};

const service: AnalyticsQueryService = {
  loadSummary: async () => ({
    window: {
      days: 30,
      current: { startUtc: '', endExclusiveUtc: '' },
      previous: { startUtc: '', endExclusiveUtc: '' },
    },
    current: emptyRollup,
    previous: emptyRollup,
    coverage: { analytics_status: {} },
  }),
  loadFunnel: async () => ({
    window: {
      days: 30,
      current: { startUtc: '', endExclusiveUtc: '' },
      previous: { startUtc: '', endExclusiveUtc: '' },
    },
    funnel: { entered: 0, steps: [] },
  }),
  listConversations: async () => ({
    data: [],
    total: 0,
    reviewSummary: { listed: 0, reviewed: 0, outcome_answered: 0 },
  }),
  loadConversationDetail: async () => null,
  upsertReview: async () => ({
    id: 'review-1',
    date_created: null,
    date_updated: '2026-01-01T00:00:00.000Z',
    user_created: 'owner-1',
    exchange_id: 'exchange-1',
    tags: ['supported'],
    notes: null,
  }),
};

function createApp(readGuard: typeof assertReadAccess) {
  const app = express();
  const router = express.Router();
  const deps = {
    ...defaultAnalyticsEndpointDeps(service, roles),
    readGuard,
  };
  registerPortfolioAnalyticsRoutes(router, deps);
  app.use('/portfolio-analytics', router);
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (error instanceof ForbiddenError || isForbiddenError(error)) {
        res.status(403).json({ errors: [{ message: 'Forbidden' }] });
        return;
      }
      next(error);
    }
  );
  return app;
}

function isForbiddenError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  return 'code' in error && error.code === 'FORBIDDEN';
}

describe('portfolio analytics route wiring', () => {
  it('rejects anonymous callers on the registered summary route', async () => {
    const app = createApp(assertReadAccess);
    const server = app.listen(0);
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Failed to bind test server.');
    }
    const response = await fetch(`http://127.0.0.1:${address.port}/portfolio-analytics/summary`);
    server.close();
    expect(response.status).toBe(403);
  });
});
