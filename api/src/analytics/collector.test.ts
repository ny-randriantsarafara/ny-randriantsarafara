import { describe, expect, it } from 'vitest';
import { createTelemetryCollector } from './collector.ts';

describe('bounded telemetry collector', () => {
  it('retries transient failures with the same ID and reports recovery without leaking error text', async () => {
    const writes: string[] = [];
    const logs: string[] = [];
    const collector = createTelemetryCollector({
      log: (message) => logs.push(message),
      retryDelayMs: 0,
    });
    await collector.enqueue('events', 'one', async () => {
      writes.push('one');
      if (writes.length < 3) throw new Error('secret visitor payload');
    });
    expect(writes).toEqual(['one', 'one', 'one']);
    expect(collector.snapshot()).toMatchObject({ succeeded: 1, failed: 0, retries: 2, pending: 0 });
    expect(JSON.stringify(logs)).not.toContain('secret');
  });
  it('coalesces pending duplicates, caps pending work and flushes before shutting down', async () => {
    let release!: () => void;
    let writes = 0;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const collector = createTelemetryCollector({
      log: () => undefined,
      capacity: 1,
      retryDelayMs: 0,
    });
    const first = collector.enqueue('events', 'one', async () => {
      writes++;
      await gate;
    });
    const duplicate = collector.enqueue('events', 'one', async () => {
      writes++;
    });
    await collector.enqueue('events', 'two', async () => {
      writes++;
    });
    expect(collector.snapshot()).toMatchObject({ pending: 1, dropped: 1 });
    let stopped = false;
    const shutdown = collector.shutdown().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    release();
    await Promise.all([first, duplicate, shutdown]);
    await collector.enqueue('events', 'three', async () => {
      writes++;
    });
    expect(writes).toBe(1);
    expect(collector.snapshot()).toMatchObject({ pending: 0, dropped: 2 });
  });
  it('stops after three attempts and records a failure with no visitor data', async () => {
    let attempts = 0;
    const logs: string[] = [];
    const collector = createTelemetryCollector({
      log: (message) => logs.push(message),
      retryDelayMs: 0,
    });
    await collector.enqueue('events', 'private-id', async () => {
      attempts++;
      throw new Error('visitor@example.com');
    });
    expect(attempts).toBe(3);
    expect(collector.snapshot()).toMatchObject({
      failed: 1,
      lastFailureAt: expect.any(String),
      pending: 0,
    });
    expect(logs).toEqual(['Telemetry write failed: events (3 attempts).']);
  });
});
