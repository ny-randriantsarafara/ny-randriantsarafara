import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('merges class names and resolves conflicts', () => {
    const result = cn('p-2 text-sm', false && 'hidden', 'p-4');
    expect(result).toBe('text-sm p-4');
  });
});
