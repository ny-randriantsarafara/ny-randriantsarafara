import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';

import { createDirectusAlertStore } from './alerts/directus-alert-store.ts';
import { createRaiseAlert } from './alerts/raise-alert.ts';
import type { AlertEmailSender } from './alerts/raise-alert.ts';
import { createSmtpAlertEmailSender, createSmtpTransport } from './alerts/smtp-alert-email.ts';
import { createDirectusMonthlyBudgetSource } from './budget/directus-monthly-budget-source.ts';
import { createMonthlyBudgetGate, createWithinBudgetGate } from './budget/monthly-budget.ts';
import { createChatService } from './chat/chat-service.ts';
import { createDirectusExchangeRecorder } from './chat/exchange-recorder.ts';
import { createOpenAiCompatibleModel } from './chat/openai-compatible-model.ts';
import { createScriptedMatcherCache } from './chat/scripted-matcher-cache.ts';
import { createContactService } from './contact/contact-service.ts';
import { createDirectusContactStore } from './contact/contact-store.ts';
import { createInternalApp, createPublicApp } from './http/index.ts';
import type { Log } from './http/responses.ts';
import { readApiEnvironment } from './environment.ts';
import type { ApiEnvironment } from './environment.ts';
import { registerApiJobs } from './jobs/register-api-jobs.ts';
import type { Scheduler } from './jobs/scheduler.ts';
import { createDirectusAssetFetcher } from './content/profile-photo.ts';
import { createActivePublicationCache } from './publications/active-publication-cache.ts';
import { createDirectusPublicationSource } from './publications/directus-publication-source.ts';
import { createMemoryRateLimiter } from './rate-limit/memory-rate-limiter.ts';
import { createDirectusEventStore } from './events/event-store.ts';
import { createEventsService } from './events/events-service.ts';
import { createAlertingSiteBuildDispatcher } from './site-build/alerting-site-build-dispatcher.ts';
import { createSiteBuildDispatcher } from './site-build/site-build-dispatcher.ts';
import { parisMonthStartIso } from './time/paris-calendar.ts';
import { createDirectusDailySaltSource } from './visitor/daily-salt-source.ts';
import { createVisitorHasher } from './visitor/visitor-hasher.ts';

// Below Docker's 10 s stop timeout: in-flight requests finish, then the process exits.
const SHUTDOWN_GRACE_MILLISECONDS = 8_000;
const BUDGET_CACHE_TTL_MILLISECONDS = 60_000;

function readEnvironmentOrExit(): ApiEnvironment {
  try {
    return readApiEnvironment(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function log(message: string): void {
  console.log(message);
}

function main(): void {
  const environment = readEnvironmentOrExit();
  const source = createDirectusPublicationSource(
    environment.directusUrl,
    environment.directusToken
  );
  const cache = createActivePublicationCache(source);
  const raiseAlert = createRaiseAlert({
    store: createDirectusAlertStore(environment.directusUrl, environment.directusToken),
    email: createAlertEmailSender(environment),
    log,
    emailEnabled: environment.smtp !== null,
  });
  const siteBuild = createAlertingSiteBuildDispatcher(
    createSiteBuildDispatcher(environment.siteBuild, fetch),
    raiseAlert,
    () => new Date()
  );
  const chatContactRateLimiter = createMemoryRateLimiter();
  const eventsRateLimiter = createMemoryRateLimiter();
  const exchangeRecorder = createDirectusExchangeRecorder(
    environment.directusUrl,
    environment.directusToken,
    log
  );
  const contactStore = createDirectusContactStore(
    environment.directusUrl,
    environment.directusToken
  );
  const clock = () => new Date();
  const budgetGate =
    environment.model === null
      ? createWithinBudgetGate()
      : createMonthlyBudgetGate({
          source: createDirectusMonthlyBudgetSource(
            environment.directusUrl,
            environment.directusToken
          ),
          budgetEur: environment.model.monthlyBudgetEur,
          monthStartIso: () => parisMonthStartIso(clock),
          clock,
          cacheTtlMilliseconds: BUDGET_CACHE_TTL_MILLISECONDS,
          log,
        });
  const model =
    environment.model === null
      ? null
      : createOpenAiCompatibleModel({
          configuration: environment.model,
          fetchImpl: fetch,
          createAbortSignal: (timeoutMilliseconds) => AbortSignal.timeout(timeoutMilliseconds),
        });
  const chatService = createChatService({
    readActivePublication: () => cache.current(),
    matcherCache: createScriptedMatcherCache(),
    model,
    modelConfiguration: environment.model,
    budgetGate,
    rateLimiter: chatContactRateLimiter,
    exchangeRecorder,
    clock,
  });
  const contactService = createContactService({
    store: contactStore,
    raiseAlert,
    rateLimiter: chatContactRateLimiter,
    clock,
  });
  const dailySaltSource = createDirectusDailySaltSource({
    directusUrl: environment.directusUrl,
    apiToken: environment.directusToken,
    clock,
    log,
  });
  const visitorHasher = createVisitorHasher(dailySaltSource);
  const eventsService = createEventsService({
    store: createDirectusEventStore(environment.directusUrl, environment.directusToken, log),
    visitorHasher,
    rateLimiter: eventsRateLimiter,
    clock,
  });
  const profilePhotoAssets = createDirectusAssetFetcher(
    environment.directusUrl,
    environment.directusToken,
    fetch
  );
  const publicApp = createPublicApp({
    cache,
    source,
    log,
    corsAllowedOrigins: environment.corsAllowedOrigins,
    chatService,
    contactService,
    eventsService,
    visitorHasher,
    profilePhotoAssets,
  });
  const internalApp = createInternalApp({
    cache,
    hookSecret: environment.hookSecret,
    siteBuild,
    log,
  });
  const servers = [
    serve({ fetch: publicApp.fetch, port: environment.port }, (info) => {
      log(`API listening on http://localhost:${info.port}`);
    }),
    serve({ fetch: internalApp.fetch, port: environment.internalPort }, (info) => {
      log(`Publication hook listening on http://localhost:${info.port}`);
    }),
  ];
  const { scheduler } = registerApiJobs({ environment, raiseAlert, log, fetchImpl: fetch });

  const shutdown = (): void => {
    void closeAndExit(servers, scheduler, log);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function createAlertEmailSender(environment: ApiEnvironment): AlertEmailSender {
  if (environment.smtp === null) {
    return { send: async () => undefined };
  }
  return createSmtpAlertEmailSender({
    configuration: environment.smtp,
    transport: createSmtpTransport(environment.smtp),
  });
}

async function closeAndExit(
  servers: readonly ServerType[],
  scheduler: Scheduler,
  logShutdown: Log
): Promise<void> {
  const forcedExit = setTimeout(() => {
    logShutdown('Shutdown grace period elapsed: exiting with open connections.');
    process.exit(1);
  }, SHUTDOWN_GRACE_MILLISECONDS);
  forcedExit.unref();
  await scheduler.stop();
  await Promise.all(servers.map(closeServer));
  process.exit(0);
}

function closeServer(server: ServerType): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

main();
