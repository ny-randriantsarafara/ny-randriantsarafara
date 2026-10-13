import { describe, expect, it } from 'vitest';

import { prefersFrench } from '../prefers-french.ts';

describe('prefersFrench', () => {
  it('detects French browser preferences', () => {
    expect(prefersFrench(['fr-FR', 'en'])).toBe(true);
    expect(prefersFrench(['fr-CA'])).toBe(true);
    expect(prefersFrench(['fr'])).toBe(true);
  });

  it('returns false for English-first or empty lists', () => {
    expect(prefersFrench(['en-US', 'fr'])).toBe(false);
    expect(prefersFrench([])).toBe(false);
  });
});
