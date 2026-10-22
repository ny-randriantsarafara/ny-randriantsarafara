import { createItem, deleteItem, readItem } from '@directus/sdk';
import { describe, expect, it } from 'vitest';

import { requireAnalyticsDatabase } from '../../extensions/analytics/src/query/analytics-database.ts';
import { purgeExpiredTelemetry } from '../../extensions/analytics/src/query/jobs.ts';
import {
  formatParisDate,
  subtractParisCalendarMonths,
} from '../../extensions/analytics/src/query/paris-calendar.ts';
import { adminClient } from './support/clients.ts';
import { createIntegrationDatabase } from './support/database.ts';

describe('analytics retention purge', () => {
  it('deletes expired telemetry and matching revisions but keeps contact messages', async () => {
    const database = createIntegrationDatabase();
    const reference = new Date();
    const todayParis = formatParisDate(reference);
    const expiredDay = subtractParisCalendarMonths(todayParis, 14);
    const expiredReceived = `${expiredDay}T12:00:00.000Z`;

    const eventId = crypto.randomUUID();
    const contactId = crypto.randomUUID();
    await adminClient.request(
      createItem('events', {
        id: eventId,
        type: 'page_view',
        locale: 'en',
        path: '/',
        device_class: 'desktop',
        visitor_hash: 'abcd1234abcd1234',
        received_at: expiredReceived,
        analytics_version: 1,
        environment: 'local',
      })
    );

    await adminClient.request(
      createItem('contact_messages', {
        id: contactId,
        locale: 'en',
        name: 'Retention survivor',
        email: 'survivor@example.com',
        message: 'Keep me out of analytics retention.',
        status: 'new',
        date_created: expiredReceived,
      })
    );

    const activityRows = await database('directus_activity')
      .insert({
        action: 'create',
        timestamp: expiredReceived,
        collection: 'events',
        item: eventId,
      })
      .returning('id');
    const activityRow = activityRows[0];
    if (activityRow === undefined) {
      throw new Error('Failed to seed directus_activity for retention test.');
    }

    const revisionRows = await database('directus_revisions')
      .insert({
        activity: activityRow.id,
        collection: 'events',
        item: eventId,
        data: { type: 'page_view' },
        delta: { type: 'page_view' },
      })
      .returning('id');
    const revisionRow = revisionRows[0];
    if (revisionRow === undefined) {
      throw new Error('Failed to seed directus_revisions for retention test.');
    }

    await purgeExpiredTelemetry(requireAnalyticsDatabase(database), reference);

    const eventLookup = await adminClient.request(readItem('events', eventId)).catch(() => null);
    expect(eventLookup).toBeNull();

    const contactLookup = await adminClient.request(readItem('contact_messages', contactId));
    expect(contactLookup.id).toBe(contactId);

    const revision = await database('directus_revisions').where({ id: revisionRow.id }).first();
    expect(revision).toBeUndefined();

    await adminClient.request(deleteItem('contact_messages', contactId));
    await database.destroy();
  });
});
