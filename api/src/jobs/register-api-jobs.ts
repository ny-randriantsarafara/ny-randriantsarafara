import { createAlertChecks } from '../alerts/alert-checks.ts';
import { createDirectusAlertStore } from '../alerts/directus-alert-store.ts';
import { createDirectusModelFailureSource } from '../alerts/directus-model-failure-source.ts';
import { createRaiseAlert } from '../alerts/raise-alert.ts';
import { createSmtpAlertEmailSender } from '../alerts/smtp-alert-email.ts';
import { createDirectusMonthlyBudgetSource } from '../budget/directus-monthly-budget-source.ts';
import type { ApiEnvironment } from '../environment.ts';
import { createSmtpTransport } from '../contact/nodemailer-notifier.ts';
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

export function registerApiJobs(
  environment: ApiEnvironment,
  log: (message: string) => void,
  fetchImpl: typeof fetch
): RegisteredJobs {
  const clock = () => new Date();
  const scheduler = createDefaultScheduler(clock, log);
  const alertStore = createDirectusAlertStore(environment.directusUrl, environment.directusToken);
  const raiseAlert = createRaiseAlert({
    store: alertStore,
    email: createAlertEmailSender(environment),
    log,
    emailEnabled: environment.smtp !== null,
  });
  registerSearchConsoleJob(scheduler, environment, raiseAlert, clock, log, fetchImpl);
  scheduler.scheduleDailyParis({
    name: 'daily-stats',
    hour: 3,
    minute: 30,
    run: () =>
      createDailyStatsJob({
        source: createDirectusDailyStatsSource(
          environment.directusUrl,
          environment.directusToken,
          fetchImpl
        ),
        clock,
        log,
      }).run(),
  });
  scheduler.scheduleDailyParis({
    name: 'retention',
    hour: 4,
    minute: 0,
    run: () =>
      createRetentionJob({
        store: createDirectusRetentionStore(
          environment.directusUrl,
          environment.directusToken,
          fetchImpl
        ),
        clock,
        log,
      }).run(),
  });
  scheduler.scheduleDailyParis({
    name: 'github-monitor',
    hour: 4,
    minute: 15,
    run: () =>
      createGitHubMonitorJob({
        configuration: environment.siteBuild,
        fetchImpl,
        raiseAlert,
        clock,
        log,
      }).run(),
  });
  scheduler.scheduleEveryParisMinutes({
    name: 'alert-checks',
    intervalMinutes: 5,
    run: () =>
      createAlertChecks({
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
      }).run(),
  });
  return { scheduler };
}

function registerSearchConsoleJob(
  scheduler: Scheduler,
  environment: ApiEnvironment,
  raiseAlert: ReturnType<typeof createRaiseAlert>,
  clock: () => Date,
  log: (message: string) => void,
  fetchImpl: typeof fetch
): void {
  const searchConsole = environment.searchConsole;
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
  scheduler.scheduleDailyParis({
    name: 'search-console-import',
    hour: 3,
    minute: 0,
    run: () =>
      createSearchConsoleImportJob({
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
      }).run(),
  });
}

function createAlertEmailSender(environment: ApiEnvironment) {
  if (environment.smtp === null) {
    return { send: async () => undefined };
  }
  return createSmtpAlertEmailSender({
    configuration: environment.smtp,
    transport: createSmtpTransport(environment.smtp),
  });
}
