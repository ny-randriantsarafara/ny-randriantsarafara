import { randomUUID } from 'node:crypto';
import type { AnalyticsEnvironment, AnalyticsStatusRecord } from '@portfolio/cms-schema';
import type { TelemetryCollector } from './collector.ts';

export function createAnalyticsStatusReporter(options: {
  directusUrl: string;
  apiToken: string;
  environment: AnalyticsEnvironment;
  collector: TelemetryCollector;
  log: (message: string) => void;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
}) {
  const id = randomUUID();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  let created = false;
  let pending: Promise<void> | null = null;
  async function write() {
    const state = options.collector.snapshot();
    const row: AnalyticsStatusRecord = {
      id,
      component: 'api-collector',
      environment: options.environment,
      last_refresh_at: (options.clock?.() ?? new Date()).toISOString(),
      last_success_at: state.lastSuccessAt,
      last_failure_at: state.lastFailureAt,
      pending: state.pending,
      succeeded: state.succeeded,
      failed: state.failed,
      dropped: state.dropped,
      retries: state.retries,
      analytics_version: 1,
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetchImpl(
          `${options.directusUrl.replace(/\/$/, '')}/items/analytics_status${created ? `/${id}` : ''}`,
          {
            method: created ? 'PATCH' : 'POST',
            signal: AbortSignal.timeout(1000),
            headers: {
              Authorization: `Bearer ${options.apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(row),
          }
        );
        if (response.ok) {
          created = true;
          return;
        }
        const payload: unknown = await response.json();
        if (JSON.stringify(payload).includes('RECORD_NOT_UNIQUE')) created = true;
      } catch {
        /* Retry without logging provider responses or credentials. */
      }
    }
    options.log('Analytics health write failed (3 attempts).');
  }
  return {
    publish(): Promise<void> {
      if (pending !== null) return pending;
      pending = Promise.resolve()
        .then(write)
        .finally(() => {
          pending = null;
        });
      return pending;
    },
  };
}
