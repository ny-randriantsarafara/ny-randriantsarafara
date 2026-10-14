import { createAlertChecks } from '../alerts/alert-checks.ts';
import { createDirectusModelFailureSource } from '../alerts/directus-model-failure-source.ts';
import type { RaiseAlert } from '../alerts/raise-alert.ts';
import { createDirectusMonthlyBudgetSource } from '../budget/directus-monthly-budget-source.ts';
import type { ApiEnvironment, SearchConsoleConfiguration } from '../environment.ts';
import {
  createGoogleAccessTokenClient,
  createMemoryAccessTokenCache,
} from '../search-console/google-access-token.ts';
import { createSearchConsoleClient } from '../search-console/search-console-client.ts';
import { createDirectusSearchConsoleStore } from '../search-console/directus-search-console-store.ts';
import { createSearchConsoleImportJob } from '../search-console/search-console-import.ts';
import { createDailyStatsJob } from './daily-stats-job.ts';
import { createDirectusDailyStatsSource } from './directus-daily-stats-source.ts';
import { createDirectusRetentionStore } from './directus-retention-store.ts';
import { createGitHubMonitorJob } from './github-monitor-job.ts';
import { createRetentionJob } from './retention-job.ts';
import { createDefaultScheduler, type Scheduler } from './scheduler.ts';

export type RegisteredJobs = {
  scheduler: Scheduler;
};

export type ApiJobsDependencies = {
  environment: ApiEnvironment;
  raiseAlert: RaiseAlert;
  log: (message: string) => void;
  fetchImpl: typeof fetch;
};

export function registerApiJobs(dependencies: ApiJobsDependencies): RegisteredJobs {
  const { environment, raiseAlert, log, fetchImpl } = dependencies;
  const clock = () => new Date();
  const scheduler = createDefaultScheduler(clock, log);
  registerSearchConsoleJob(scheduler, dependencies, environment.searchConsole, clock);
  const dailyStatsJob = createDailyStatsJob({
    source: createDirectusDailyStatsSource(
      environment.directusUrl,
      environment.directusToken,
      fetchImpl
    ),
    clock,
    log,
  });
  scheduler.scheduleDailyParis({
    name: 'daily-stats',
    hour: 3,
    minute: 30,
    run: () => dailyStatsJob.run(),
  });
  const retentionJob = createRetentionJob({
    store: createDirectusRetentionStore(
      environment.directusUrl,
      environment.directusToken,
      fetchImpl
    ),
    clock,
    log,
  });
  scheduler.scheduleDailyParis({
    name: 'retention',
    hour: 4,
    minute: 0,
    run: () => retentionJob.run(),
  });
  const gitHubMonitorJob = createGitHubMonitorJob({
    configuration: environment.siteBuild,
    fetchImpl,
    raiseAlert,
    clock,
    log,
  });
  scheduler.scheduleDailyParis({
    name: 'github-monitor',
    hour: 4,
    minute: 15,
    run: () => gitHubMonitorJob.run(),
  });
  const alertChecks = createAlertChecks({
    modelConfiguration: environment.model,
    budgetSource: createDirectusMonthlyBudgetSource(
      environment.directusUrl,
      environment.directusToken,
      fetchImpl
    ),
    modelFailureSource: createDirectusModelFailureSource(
      environment.directusUrl,
      environment.directusToken,
      fetchImpl
    ),
    raiseAlert,
    clock,
  });
  scheduler.scheduleEveryParisMinutes({
    name: 'alert-checks',
    intervalMinutes: 5,
    run: () => alertChecks.run(),
  });
  return { scheduler };
}

function registerSearchConsoleJob(
  scheduler: Scheduler,
  dependencies: ApiJobsDependencies,
  searchConsole: SearchConsoleConfiguration | null,
  clock: () => Date
): void {
  const { environment, raiseAlert, log, fetchImpl } = dependencies;
  if (searchConsole === null) {
    log('Search Console import disabled: GOOGLE_SERVICE_ACCOUNT_JSON is not set.');
    return;
  }
  const tokenClient = createGoogleAccessTokenClient({
    account: searchConsole.account,
    fetchImpl,
    cache: createMemoryAccessTokenCache(),
    clock,
  });
  const importJob = createSearchConsoleImportJob({
    client: createSearchConsoleClient({
      property: searchConsole.property,
      accessToken: () => tokenClient.getAccessToken(),
      fetchImpl,
    }),
    store: createDirectusSearchConsoleStore(
      environment.directusUrl,
      environment.directusToken,
      fetchImpl
    ),
    raiseAlert,
    clock,
    log,
  });
  scheduler.scheduleDailyParis({
    name: 'search-console-import',
    hour: 3,
    minute: 0,
    run: () => importJob.run(),
  });
}
