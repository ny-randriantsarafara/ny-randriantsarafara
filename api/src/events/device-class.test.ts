import { describe, expect, it } from 'vitest';

import { readDeviceClass } from './device-class.ts';

describe('readDeviceClass', () => {
  it('classifies mobile, tablet and desktop user agents', () => {
    expect(readDeviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      'mobile'
    );
    expect(readDeviceClass('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(readDeviceClass('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
  });
});
