export type CollectorSnapshot = {
  pending: number;
  succeeded: number;
  failed: number;
  dropped: number;
  retries: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};
export type TelemetryCollector = ReturnType<typeof createTelemetryCollector>;

// Process-local work is bounded, but cannot survive a process crash.
export function createTelemetryCollector(options: {
  log: (message: string) => void;
  capacity?: number;
  retryDelayMs?: number;
  clock?: () => Date;
}) {
  const pending = new Map<string, Promise<void>>();
  const clock = options.clock ?? (() => new Date());
  let closed = false;
  const state: Omit<CollectorSnapshot, 'pending'> = {
    succeeded: 0,
    failed: 0,
    dropped: 0,
    retries: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
  };
  async function write(collection: string, operation: () => Promise<void>): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await operation();
        state.succeeded++;
        state.lastSuccessAt = clock().toISOString();
        return;
      } catch {
        if (attempt < 2) {
          state.retries++;
          await new Promise((resolve) =>
            setTimeout(resolve, (options.retryDelayMs ?? 100) * (attempt + 1))
          );
        }
      }
    }
    state.failed++;
    state.lastFailureAt = clock().toISOString();
    options.log(`Telemetry write failed: ${collection} (3 attempts).`);
  }
  return {
    snapshot(): CollectorSnapshot {
      return { ...state, pending: pending.size };
    },
    enqueue(collection: string, id: string, operation: () => Promise<void>): Promise<void> {
      const key = `${collection}:${id}`;
      const existing = pending.get(key);
      if (existing !== undefined) return existing;
      if (closed || pending.size >= (options.capacity ?? 256)) {
        state.dropped++;
        state.lastFailureAt = clock().toISOString();
        options.log(`Telemetry capacity exceeded: ${collection}.`);
        return Promise.resolve();
      }
      const work = Promise.resolve()
        .then(() => write(collection, operation))
        .finally(() => pending.delete(key));
      pending.set(key, work);
      return work;
    },
    async flush(): Promise<void> {
      while (pending.size > 0) await Promise.all([...pending.values()]);
    },
    async shutdown(): Promise<void> {
      closed = true;
      await Promise.all([...pending.values()]);
    },
  };
}
