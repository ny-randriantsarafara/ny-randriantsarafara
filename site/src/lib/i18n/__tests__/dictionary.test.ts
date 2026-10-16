import { describe, expect, it } from 'vitest';

import { dictionaries } from '../dictionary.ts';

type StringLeaf = {
  path: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectStringLeaves(
  value: unknown,
  prefix: readonly string[] = []
): readonly StringLeaf[] {
  if (typeof value === 'string') {
    return [{ path: prefix.join('.'), value }];
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    collectStringLeaves(child, [...prefix, key])
  );
}

const identicalInBothLocalesAllowlist: ReadonlySet<string> = new Set([
  'about.technologiesHeader',
  'about.technologiesTitle',
  'about.usages.backend',
  'about.usages.frontend',
  'contact.channelGithub',
  'contact.channelLinkedin',
  'contact.eyebrow',
  'cv.contact',
  'hero.headlineHighlight',
  'nav.contact',
]);

describe('dictionaries', () => {
  it('exposes the same string key paths in English and French', () => {
    const enPaths = collectStringLeaves(dictionaries.en).map((leaf) => leaf.path);
    const frPaths = collectStringLeaves(dictionaries.fr).map((leaf) => leaf.path);
    expect(enPaths.sort()).toEqual(frPaths.sort());
  });

  it('translates every French string away from English except allowlisted leaves', () => {
    const enByPath = new Map(
      collectStringLeaves(dictionaries.en).map((leaf) => [leaf.path, leaf.value])
    );
    const untranslated: string[] = [];

    for (const { path, value: frValue } of collectStringLeaves(dictionaries.fr)) {
      const enValue = enByPath.get(path);
      if (enValue === undefined) {
        continue;
      }
      if (frValue === enValue && !identicalInBothLocalesAllowlist.has(path)) {
        untranslated.push(path);
      }
    }

    expect(untranslated).toEqual([]);
  });

  it('writes no long dash in either language', () => {
    const withLongDash = [
      ...collectStringLeaves(dictionaries.en),
      ...collectStringLeaves(dictionaries.fr),
    ].filter((leaf) => /[—–]/.test(leaf.value));

    expect(withLongDash).toEqual([]);
  });
});
