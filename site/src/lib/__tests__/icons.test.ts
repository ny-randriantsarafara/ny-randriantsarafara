import { iconNames } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import { iconRegistry, isKnownIcon } from '@/lib/icons';

import type { IconName } from '@/lib/icons';

describe('iconRegistry', () => {
  it('exposes a component for every content icon name', () => {
    for (const name of iconNames) {
      if (!isKnownIcon(name)) {
        throw new Error(`Missing icon registry entry for ${name}`);
      }
      expect(iconRegistry[name]).toBeDefined();
    }
  });

  it('exposes UI icons used by the site chrome', () => {
    const uiIcons: IconName[] = [
      'download',
      'arrow-up-right',
      'arrow-right',
      'mail',
      'map-pin',
      'languages',
      'home',
      'user',
      'sun',
      'moon',
    ];
    for (const name of uiIcons) {
      expect(iconRegistry[name]).toBeDefined();
    }
  });

  it('isKnownIcon narrows arbitrary strings to IconName', () => {
    expect(isKnownIcon('cloud')).toBe(true);
    expect(isKnownIcon('not-an-icon')).toBe(false);
  });
});
