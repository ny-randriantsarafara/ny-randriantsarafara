import { performance } from 'node:perf_hooks';

// Time the full engine transport: headers, body consumption, JSON parsing and errors.
export async function measureCompletion<T>(
  complete: () => Promise<T>,
  record: (milliseconds: number) => void
): Promise<T> {
  const started = performance.now();
  try {
    return await complete();
  } finally {
    record(performance.now() - started);
  }
}
