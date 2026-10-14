import {
  millisecondsUntilNextParisDaily,
  millisecondsUntilNextParisInterval,
  parisSlotKey,
} from './paris-schedule.ts';
import { readParisCalendar } from '../time/paris-calendar.ts';

export type JobRunResult = { status: 'ok' } | { status: 'failed'; reason: string };

export type SchedulerTimers = {
  setTimeout(callback: () => void, delayMilliseconds: number): number;
  clearTimeout(timerId: number): void;
};

export type SchedulerLog = (message: string) => void;

export type SchedulerDependencies = {
  clock: () => Date;
  timers: SchedulerTimers;
  log: SchedulerLog;
};

export type JobRunner = () => Promise<void>;

export type ScheduledJobHandle = {
  stop(): void;
};

export type Scheduler = {
  scheduleDailyParis(options: {
    name: string;
    hour: number;
    minute: number;
    run: JobRunner;
  }): ScheduledJobHandle;
  scheduleEveryParisMinutes(options: {
    name: string;
    intervalMinutes: number;
    run: JobRunner;
  }): ScheduledJobHandle;
  stop(): Promise<void>;
};

type JobState = {
  name: string;
  timerId: number | null;
  running: boolean;
  stopped: boolean;
  lastParisSlot: string | null;
  scheduleNext: () => void;
  runGuarded: () => Promise<JobRunResult>;
};

type SchedulerState = {
  jobs: JobState[];
  stopping: boolean;
  inFlight: Promise<void>[];
};

const defaultTimers: SchedulerTimers = {
  setTimeout: (callback, delayMilliseconds) => {
    const timerId = globalThis.setTimeout(callback, delayMilliseconds);
    if (typeof timerId !== 'number') {
      throw new Error('Expected a numeric timer handle.');
    }
    return timerId;
  },
  clearTimeout: (timerId) => globalThis.clearTimeout(timerId),
};

export function createScheduler(dependencies: SchedulerDependencies): Scheduler {
  const state: SchedulerState = { jobs: [], stopping: false, inFlight: [] };

  return {
    scheduleDailyParis: (options) => registerDailyJob(state, dependencies, options),
    scheduleEveryParisMinutes: (options) => registerIntervalJob(state, dependencies, options),
    stop: () => stopScheduler(state, dependencies),
  };
}

export function createDefaultScheduler(clock: () => Date, log: SchedulerLog): Scheduler {
  return createScheduler({ clock, timers: defaultTimers, log });
}

function registerDailyJob(
  schedulerState: SchedulerState,
  dependencies: SchedulerDependencies,
  options: { name: string; hour: number; minute: number; run: JobRunner }
): ScheduledJobHandle {
  const jobState = createJobState(schedulerState, dependencies, options.name, options.run, () =>
    millisecondsUntilNextParisDaily(dependencies.clock, options.hour, options.minute)
  );
  jobState.scheduleNext();
  return { stop: () => stopJob(jobState, dependencies) };
}

function registerIntervalJob(
  schedulerState: SchedulerState,
  dependencies: SchedulerDependencies,
  options: { name: string; intervalMinutes: number; run: JobRunner }
): ScheduledJobHandle {
  const jobState = createJobState(schedulerState, dependencies, options.name, options.run, () =>
    millisecondsUntilNextParisInterval(dependencies.clock, options.intervalMinutes)
  );
  jobState.scheduleNext();
  return { stop: () => stopJob(jobState, dependencies) };
}

function createJobState(
  schedulerState: SchedulerState,
  dependencies: SchedulerDependencies,
  name: string,
  run: JobRunner,
  readDelay: () => number
): JobState {
  const jobState: JobState = {
    name,
    timerId: null,
    running: false,
    stopped: false,
    lastParisSlot: null,
    scheduleNext: () => undefined,
    runGuarded: () => Promise.resolve({ status: 'ok' }),
  };

  jobState.scheduleNext = () => {
    if (jobState.stopped || schedulerState.stopping) {
      return;
    }
    const delayMilliseconds = readDelay();
    jobState.timerId = dependencies.timers.setTimeout(() => {
      void executeJob(schedulerState, dependencies, jobState, readDelay, run);
    }, delayMilliseconds);
  };

  jobState.runGuarded = () => runJobOnce(jobState, dependencies, run);

  schedulerState.jobs.push(jobState);
  return jobState;
}

async function executeJob(
  schedulerState: SchedulerState,
  dependencies: SchedulerDependencies,
  jobState: JobState,
  readDelay: () => number,
  run: JobRunner
): Promise<void> {
  jobState.timerId = null;
  const slot = parisSlotKey(readParisCalendar(dependencies.clock));
  if (jobState.lastParisSlot === slot) {
    dependencies.log(`Job ${jobState.name} skipped: duplicate Paris slot ${slot}.`);
    jobState.scheduleNext();
    return;
  }
  const tracked = trackInFlight(schedulerState, runJobOnce(jobState, dependencies, run));
  const result = await tracked;
  if (result.status === 'failed') {
    dependencies.log(`Job ${jobState.name} failed: ${result.reason}`);
  }
  jobState.lastParisSlot = slot;
  jobState.scheduleNext();
}

async function runJobOnce(
  jobState: JobState,
  dependencies: SchedulerDependencies,
  run: JobRunner
): Promise<JobRunResult> {
  if (jobState.running) {
    dependencies.log(`Job ${jobState.name} skipped: previous run still in progress.`);
    return { status: 'ok' };
  }
  jobState.running = true;
  try {
    await run();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'failed', reason: describeJobError(error) };
  } finally {
    jobState.running = false;
  }
}

function trackInFlight(
  schedulerState: SchedulerState,
  promise: Promise<JobRunResult>
): Promise<JobRunResult> {
  const wrapped = promise.finally(() => {
    schedulerState.inFlight = schedulerState.inFlight.filter((entry) => entry !== wrapped);
  });
  schedulerState.inFlight.push(wrapped.then(() => undefined));
  return promise;
}

function stopJob(jobState: JobState, dependencies: SchedulerDependencies): void {
  jobState.stopped = true;
  if (jobState.timerId !== null) {
    dependencies.timers.clearTimeout(jobState.timerId);
    jobState.timerId = null;
  }
}

async function stopScheduler(
  schedulerState: SchedulerState,
  dependencies: SchedulerDependencies
): Promise<void> {
  schedulerState.stopping = true;
  for (const job of schedulerState.jobs) {
    stopJob(job, dependencies);
  }
  await Promise.all(schedulerState.inFlight);
}

function describeJobError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unexpected error';
}
