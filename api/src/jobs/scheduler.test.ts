import { describe, expect, it, vi } from 'vitest';

import { createScheduler, type SchedulerTimers } from './scheduler.ts';

type PendingTimer = {
  id: number;
  fireAt: number;
  callback: () => void;
};

function createControllableTimers(initialNow: number): {
  timers: SchedulerTimers;
  setNow: (milliseconds: number) => void;
  runDueTimers: () => void;
  now: () => number;
} {
  const state = { now: initialNow, nextId: 1, pending: [] as PendingTimer[] };
  return {
    now: () => state.now,
    setNow: (milliseconds) => {
      state.now = milliseconds;
    },
    runDueTimers: () => {
      const due = state.pending.filter((timer) => timer.fireAt <= state.now);
      state.pending = state.pending.filter((timer) => timer.fireAt > state.now);
      for (const timer of due) {
        timer.callback();
      }
    },
    timers: {
      setTimeout: (callback, delayMilliseconds) => {
        const id = state.nextId;
        state.nextId += 1;
        state.pending.push({ id, fireAt: state.now + delayMilliseconds, callback });
        return id;
      },
      clearTimeout: (timerId) => {
        state.pending = state.pending.filter((timer) => timer.id !== timerId);
      },
    },
  };
}

describe('createScheduler', () => {
  it('runs a daily Paris job once on a spring-forward day', async () => {
    const start = new Date('2026-03-28T23:00:00.000Z').getTime();
    const control = createControllableTimers(start);
    const clock = () => new Date(control.now());
    const run = vi.fn(async () => undefined);
    const log = vi.fn();
    createScheduler({ clock, timers: control.timers, log }).scheduleDailyParis({
      name: 'spring-forward',
      hour: 2,
      minute: 30,
      run,
    });
    control.setNow(new Date('2026-03-29T01:00:00.000Z').getTime());
    control.runDueTimers();
    expect(run).toHaveBeenCalledOnce();
  });

  it('runs a daily Paris job once when the fall-back hour repeats', async () => {
    const first = new Date('2026-10-25T00:30:00.000Z').getTime();
    const control = createControllableTimers(first);
    const clock = () => new Date(control.now());
    const run = vi.fn(async () => undefined);
    createScheduler({ clock, timers: control.timers, log: vi.fn() }).scheduleDailyParis({
      name: 'fall-back',
      hour: 2,
      minute: 30,
      run,
    });
    control.runDueTimers();
    expect(run).toHaveBeenCalledOnce();
    control.setNow(new Date('2026-10-25T01:30:00.000Z').getTime());
    control.runDueTimers();
    expect(run).toHaveBeenCalledOnce();
  });

  it('does not overlap a slow job with the next tick', async () => {
    const control = createControllableTimers(new Date('2026-10-14T10:00:00.000Z').getTime());
    const clock = () => new Date(control.now());
    const release = vi.fn();
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release.mockImplementation(resolve);
        })
    );
    createScheduler({ clock, timers: control.timers, log: vi.fn() }).scheduleEveryParisMinutes({
      name: 'interval',
      intervalMinutes: 5,
      run,
    });
    control.runDueTimers();
    expect(run).toHaveBeenCalledOnce();
    control.setNow(control.now() + 5 * 60_000);
    control.runDueTimers();
    expect(run).toHaveBeenCalledOnce();
    release();
    await Promise.resolve();
  });

  it('logs failures without throwing', async () => {
    const control = createControllableTimers(new Date('2026-10-14T01:00:00.000Z').getTime());
    const clock = () => new Date(control.now());
    const log = vi.fn();
    createScheduler({ clock, timers: control.timers, log }).scheduleDailyParis({
      name: 'failing',
      hour: 3,
      minute: 0,
      run: async () => {
        throw new Error('boom');
      },
    });
    control.runDueTimers();
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith('Job failing failed: boom');
    });
  });
});
