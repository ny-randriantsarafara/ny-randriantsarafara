import { afterEach, describe, expect, it } from 'vitest';

import { syncQuickViewClass } from '@/lib/chat/sync-quick-view-class.ts';

describe('syncQuickViewClass', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('toggles quick-view-visible on chat and quick view roots', () => {
    document.body.innerHTML =
      '<div class="conversational-ui"></div><div class="quick-view-content"></div>';
    syncQuickViewClass(true);
    expect(
      document.querySelector('.conversational-ui')?.classList.contains('quick-view-visible')
    ).toBe(true);
    expect(
      document.querySelector('.quick-view-content')?.classList.contains('quick-view-visible')
    ).toBe(true);
    syncQuickViewClass(false);
    expect(
      document.querySelector('.conversational-ui')?.classList.contains('quick-view-visible')
    ).toBe(false);
  });
});
