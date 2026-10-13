import { describe, expect, it } from 'vitest';

import { iconRegistry, isKnownIcon } from '@/lib/icons';

import type { IconName } from '@/lib/icons';

describe('iconRegistry', () => {
  it('exposes a component for every declared IconName', () => {
    const knownIcons: IconName[] = [
      'cloud',
      'server',
      'database',
      'shield-check',
      'brain-circuit',
      'map',
      'workflow',
      'sparkles',
      'download',
      'arrow-up-right',
      'arrow-right',
      'mail',
      'map-pin',
      'languages',
      'home',
      'user',
      'layers',
      'briefcase',
      'sun',
      'moon',
    ];

    for (const name of knownIcons) {
      expect(iconRegistry[name]).toBeDefined();
    }
  });

  it('isKnownIcon narrows arbitrary strings to IconName', () => {
    expect(isKnownIcon('cloud')).toBe(true);
    expect(isKnownIcon('not-an-icon')).toBe(false);
  });
});
