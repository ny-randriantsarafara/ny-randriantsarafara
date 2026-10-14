import { describe, expect, it } from 'vitest';

import { hashVisitor } from './visitor-hash.ts';

describe('hashVisitor', () => {
  it('returns a 16-character hex digest', () => {
    const salt = Buffer.from('01234567890123456789012345678901');
    const digest = hashVisitor(salt, '203.0.113.1', 'Mozilla/5.0');
    expect(digest).toHaveLength(16);
    expect(digest).toMatch(/^[0-9a-f]{16}$/);
  });

  it('changes when the daily salt changes', () => {
    const first = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const second = Buffer.from('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    const left = hashVisitor(first, '203.0.113.1', 'Mozilla/5.0');
    const right = hashVisitor(second, '203.0.113.1', 'Mozilla/5.0');
    expect(left).not.toBe(right);
  });
});
