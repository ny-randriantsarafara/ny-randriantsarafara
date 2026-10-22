import type { Router } from 'express';
import { ForbiddenError, InvalidPayloadError } from '@directus/errors';

import { assertOwnerAccess, assertReadAccess } from '../auth/access-guards.ts';
import type { AnalyticsRoleIds } from '../auth/roles.ts';
import type { AnalyticsDataService } from '../query/analytics-data-service.ts';
import {
  AnalyticsFilterError,
  parseAnalyticsFilters,
  pickAnalyticsFilterQuery,
  rejectUnknownFilterKeys,
} from '../query/filters.ts';
import { redactReviewNotes } from '../redact/notes.ts';
import { parseRequiredChatReviewTags } from '../review/tags.ts';

export type ReadGuard = (
  accountability: Express.Request['accountability'],
  roles: AnalyticsRoleIds
) => void;

export type OwnerGuard = (
  accountability: Express.Request['accountability'],
  roles: AnalyticsRoleIds
) => void;

export type AnalyticsQueryService = Pick<
  AnalyticsDataService,
  'loadSummary' | 'loadFunnel' | 'listConversations' | 'loadConversationDetail' | 'upsertReview'
>;

export type AnalyticsEndpointDeps = {
  service: AnalyticsQueryService;
  roles: AnalyticsRoleIds;
  readGuard: ReadGuard;
  ownerGuard: OwnerGuard;
};

export function defaultAnalyticsEndpointDeps(
  service: AnalyticsDataService,
  roles: AnalyticsRoleIds
): AnalyticsEndpointDeps {
  return {
    service,
    roles,
    readGuard: assertReadAccess,
    ownerGuard: assertOwnerAccess,
  };
}

export function registerPortfolioAnalyticsRoutes(
  router: Router,
  deps: AnalyticsEndpointDeps
): void {
  router.get('/summary', async (req, res, next) => {
    try {
      deps.readGuard(req.accountability, deps.roles);
      const filters = readAnalyticsFilters(req.query);
      const summary = await deps.service.loadSummary(filters, new Date());
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  });

  router.get('/funnel', async (req, res, next) => {
    try {
      deps.readGuard(req.accountability, deps.roles);
      const filters = readAnalyticsFilters(req.query);
      const funnel = await deps.service.loadFunnel(filters, new Date());
      res.json({ data: funnel });
    } catch (error) {
      next(error);
    }
  });

  router.get('/conversations', async (req, res, next) => {
    try {
      deps.readGuard(req.accountability, deps.roles);
      const filters = readAnalyticsFilters(req.query);
      const page = readInteger(req.query.page, 1);
      const limit = readInteger(req.query.limit, 25);
      const list = await deps.service.listConversations(filters, page, limit);
      res.json({
        data: list.data,
        meta: {
          total: list.total,
          page,
          limit,
          review_summary: list.reviewSummary,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/conversations/:id', async (req, res, next) => {
    try {
      deps.readGuard(req.accountability, deps.roles);
      const detail = await deps.service.loadConversationDetail(req.params.id);
      if (detail === null) {
        res.status(404).json({ errors: [{ message: 'Conversation not found.' }] });
        return;
      }
      res.json({ data: detail });
    } catch (error) {
      next(error);
    }
  });

  router.put('/reviews/:exchangeId', async (req, res, next) => {
    try {
      deps.ownerGuard(req.accountability, deps.roles);
      const body = readReviewBody(req.body);
      const userId = req.accountability?.user;
      if (userId === null || userId === undefined) {
        throw new ForbiddenError();
      }
      const saved = await deps.service.upsertReview(
        req.params.exchangeId,
        body.tags,
        body.notes,
        userId
      );
      res.json({ data: saved });
    } catch (error) {
      next(error);
    }
  });
}

function readAnalyticsFilters(query: unknown) {
  try {
    const record = readQueryRecord(query);
    rejectUnknownFilterKeys(record);
    return parseAnalyticsFilters(pickAnalyticsFilterQuery(record));
  } catch (error) {
    if (error instanceof AnalyticsFilterError) {
      throw new InvalidPayloadError({ reason: error.message });
    }
    throw error;
  }
}

function readQueryRecord(query: unknown): Record<string, string | undefined> {
  if (query === null || typeof query !== 'object') {
    return {};
  }
  const record: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      record[key] = value;
      continue;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      record[key] = value[0];
    }
  }
  return record;
}

function readInteger(raw: unknown, fallback: number): number {
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readReviewBody(body: unknown): {
  tags: ReturnType<typeof parseRequiredChatReviewTags>;
  notes: string | null;
} {
  const record = readObjectRecord(body, 'Review body must be an object.');
  let tags: ReturnType<typeof parseRequiredChatReviewTags>;
  try {
    tags = parseRequiredChatReviewTags(record.tags);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Review tags are invalid.';
    throw new InvalidPayloadError({ reason });
  }
  const notes = readNotes(record.notes);
  return { tags, notes };
}

function readObjectRecord(body: unknown, message: string): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidPayloadError({ reason: message });
  }
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    record[key] = value;
  }
  return record;
}

function readNotes(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string') {
    throw new InvalidPayloadError({ reason: 'Review notes must be a string.' });
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  return redactReviewNotes(trimmed);
}
