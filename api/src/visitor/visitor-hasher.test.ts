import { describe, expect, it } from 'vitest';

import { createVisitorHasher } from './visitor-hasher.ts';

describe('createVisitorHasher', () => {
  it('hashes with the salt returned by the source', async () => {
    const salt = Buffer.from('01234567890123456789012345678901');
    const hasher = createVisitorHasher({
      currentSalt: async () => salt,
    });
    const digest = await hasher.derive('203.0.113.1', 'Mozilla/5.0');
    expect(digest).toHaveLength(16);
  });
});
