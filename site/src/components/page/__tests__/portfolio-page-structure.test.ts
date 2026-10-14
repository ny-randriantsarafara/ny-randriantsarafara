import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function countMainLandmarks(relativePath: string): number {
  const filePath = path.join(process.cwd(), relativePath);
  const html = readFileSync(filePath, 'utf8');
  const matches = html.match(/id="main"/g);
  return matches?.length ?? 0;
}

const exportReady =
  existsSync(path.join(process.cwd(), 'out/index.html')) &&
  existsSync(path.join(process.cwd(), 'out/fr.html'));

describe('static export structure', () => {
  it.skipIf(!exportReady)('includes a single main landmark per locale home', () => {
    expect(countMainLandmarks('out/index.html')).toBe(1);
    expect(countMainLandmarks('out/fr.html')).toBe(1);
  });

  it.skipIf(!exportReady)('includes a single experience section heading in English export', () => {
    const html = readFileSync(path.join(process.cwd(), 'out/index.html'), 'utf8');
    const matches = html.match(/Experience/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    expect(html.match(/id="experience-wrapper"/g)?.length).toBe(1);
  });
});
