import type { AnalyticsEnvironment } from '@portfolio/cms-schema';

const allowed: readonly AnalyticsEnvironment[] = ['local', 'staging', 'prod'];

export function readAnalyticsEnvironment(source: Record<string, unknown>): AnalyticsEnvironment {
  const raw = source.ANALYTICS_ENVIRONMENT;
  if (raw === undefined || raw === null || raw === '') {
    return 'local';
  }
  if (typeof raw !== 'string') {
    throw new Error('ANALYTICS_ENVIRONMENT must be local, staging or prod.');
  }
  const value = raw.trim();
  if (isAnalyticsEnvironment(value)) {
    return value;
  }
  throw new Error('ANALYTICS_ENVIRONMENT must be local, staging or prod.');
}

export function isAnalyticsEnvironment(value: string): value is AnalyticsEnvironment {
  for (const entry of allowed) {
    if (entry === value) {
      return true;
    }
  }
  return false;
}
