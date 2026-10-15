import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('isolated corpus runner', () => {
  // Six isolated Node processes share CPU with the workspace test suites.
  it('runs the selected engine offline and writes attempts plus public responses', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cms-runner-test-'));
    const output = resolve(directory, 'trace.jsonl');
    try {
      const result = spawnSync(
        process.execPath,
        [
          'scripts/evaluate-cms-corpus.ts',
          `--engine-dir=${resolve('..')}`,
          '--variant=optimized',
          '--offline',
          '--seeds=7',
          `--output=${output}`,
        ],
        { encoding: 'utf8', timeout: 20000 }
      );
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      const entries = readFileSync(output, 'utf8')
        .trim()
        .split('\n')
        .map((line) => z.object({ type: z.string() }).passthrough().parse(JSON.parse(line)));
      expect(entries.filter((entry) => entry.type === 'run')).toHaveLength(1);
      expect(entries.filter((entry) => entry.type === 'result')).toHaveLength(6);
      expect(entries.some((entry) => entry.type === 'attempt')).toBe(true);
      const trace = readFileSync(output, 'utf8');
      expect(trace).toContain('publicationId');
      expect(trace).toContain('quotaWaitMs');
      expect(trace).not.toContain('offline-placeholder');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 25000);
});
