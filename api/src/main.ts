import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';

import { createDirectusMonthlyBudgetSource } from './budget/directus-monthly-budget-source.ts';
import { createMonthlyBudgetGate, createWithinBudgetGate } from './budget/monthly-budget.ts';
import { createChatService, type ModelModeDependencies } from './chat/chat-service.ts';
import { createDirectusExchangeRecorder } from './chat/exchange-recorder.ts';
import { createOpenAiCompatibleModel } from './chat/openai-compatible-model.ts';
import { createModelProviderRegistry } from './chat/model-provider.ts';
import { createScriptedMatcherCache } from './chat/scripted-matcher-cache.ts';
import { createContactService } from './contact/contact-service.ts';
import { createDirectusContactStore } from './contact/contact-store.ts';
import {
  createNodemailerContactNotifier,
  createSmtpTransport,
} from './contact/nodemailer-notifier.ts';
import { createSkipEmailNotifier } from './contact/skip-email-notifier.ts';
import { createInternalApp, createPublicApp } from './http/index.ts';
import type { Log } from './http/responses.ts';
import { readApiEnvironment } from './environment.ts';
import type { ApiEnvironment, ModelRuntimeConfiguration } from './environment.ts';
import { createDirectusAssetFetcher } from './content/profile-photo.ts';
import { createDirectusModelSettingsSource } from './model-settings/directus-model-settings-source.ts';
import { createModelSettingsReader } from './model-settings/model-settings.ts';
import { createActivePublicationCache } from './publications/active-publication-cache.ts';
import { createDirectusPublicationSource } from './publications/directus-publication-source.ts';
import { createMemoryRateLimiter } from './rate-limit/memory-rate-limiter.ts';
import { createDirectusEventStore } from './events/event-store.ts';
import { createEventsService } from './events/events-service.ts';
import { createSiteBuildDispatcher } from './site-build/site-build-dispatcher.ts';
import { parisMonthStartIso } from './time/paris-calendar.ts';
import { createDirectusDailySaltSource } from './visitor/daily-salt-source.ts';
import { createVisitorLocaleResolver } from './visitor/visitor-locale.ts';
import { createVisitorHasher } from './visitor/visitor-hasher.ts';

// Below Docker's 10 s stop timeout: in-flight requests finish, then the process exits.
const SHUTDOWN_GRACE_MILLISECONDS = 8_000;
const BUDGET_CACHE_TTL_MILLISECONDS = 60_000;
// The model_settings collection note promises that a change applies within 30 seconds.
const MODEL_SETTINGS_CACHE_TTL_MILLISECONDS = 30_000;

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

function createModelMode(
  environment: ApiEnvironment,
  runtime: ModelRuntimeConfiguration,
  clock: () => Date
): ModelModeDependencies {
  const settingsReader = createModelSettingsReader({
    source: createDirectusModelSettingsSource(environment.directusUrl, environment.directusToken),
    clock,
    cacheTtlMilliseconds: MODEL_SETTINGS_CACHE_TTL_MILLISECONDS,
    log,
  });
  return {
    ...(runtime.legacy === null
      ? {}
      : {
          model: createOpenAiCompatibleModel({
            provider: runtime.legacy,
            fetchImpl: fetch,
            createAbortSignal: (timeoutMilliseconds) => AbortSignal.timeout(timeoutMilliseconds),
          }),
        }),
    registry: createModelProviderRegistry(runtime.credentials, fetch),
    readSettings: () => settingsReader.readStatus(),
    dailyCallLimit: runtime.dailyCallLimit,
  };
}

function main(): void {
  const environment = readEnvironmentOrExit();
  const source = createDirectusPublicationSource(
    environment.directusUrl,
    environment.directusToken
  );
  const cache = createActivePublicationCache(source);
  const siteBuild = createSiteBuildDispatcher(environment.siteBuild, fetch);
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
  const contactNotifier =
    environment.smtp === null
      ? createSkipEmailNotifier(log)
      : createNodemailerContactNotifier({
          configuration: environment.smtp,
          createTransport: createSmtpTransport,
          log,
        });
  const clock = () => new Date();
  const budgetGate =
    environment.modelRuntime === null
      ? createWithinBudgetGate()
      : createMonthlyBudgetGate({
          source: createDirectusMonthlyBudgetSource(
            environment.directusUrl,
            environment.directusToken
          ),
          budgetEur: environment.modelRuntime.monthlyBudgetEur,
          monthStartIso: () => parisMonthStartIso(clock),
          clock,
          cacheTtlMilliseconds: BUDGET_CACHE_TTL_MILLISECONDS,
          log,
        });
  const modelMode =
    environment.modelRuntime === null
      ? null
      : createModelMode(environment, environment.modelRuntime, clock);
  const chatService = createChatService({
    readActivePublication: () => cache.current(),
    matcherCache: createScriptedMatcherCache(),
    modelMode,
    budgetGate,
    rateLimiter: chatContactRateLimiter,
    exchangeRecorder,
    clock,
  });
  const contactService = createContactService({
    store: contactStore,
    notifier: contactNotifier,
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
    visitorLocale: createVisitorLocaleResolver(fetch),
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

  const shutdown = (): void => {
    void closeAndExit(servers, log);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

async function closeAndExit(servers: readonly ServerType[], logShutdown: Log): Promise<void> {
  const forcedExit = setTimeout(() => {
    logShutdown('Shutdown grace period elapsed: exiting with open connections.');
    process.exit(1);
  }, SHUTDOWN_GRACE_MILLISECONDS);
  forcedExit.unref();
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
