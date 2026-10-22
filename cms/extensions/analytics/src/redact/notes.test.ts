import { describe, expect, it } from 'vitest';

import { redactReviewNotes } from './notes.ts';

describe('redactReviewNotes', () => {
  it('redacts emails and credential-like tokens', () => {
    const redacted = redactReviewNotes(
      'Reach me at pat@example.com with token abc123DEF456GHI789JKL012MNO'
    );
    expect(redacted).not.toContain('pat@example.com');
    expect(redacted).toContain('[email]');
    expect(redacted).toContain('[credential]');
  });
});
