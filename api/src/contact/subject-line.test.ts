import { describe, expect, it } from 'vitest';

import { buildContactSubject, sanitizeHeaderFragment } from './subject-line.ts';
import { contactRequestSchema } from './contact-request.ts';

describe('sanitizeHeaderFragment', () => {
  it('removes carriage returns and line feeds', () => {
    expect(sanitizeHeaderFragment('Recruiter\r\nTeam')).toBe('Recruiter Team');
  });
});

describe('buildContactSubject', () => {
  it('sanitizes injected newlines in the subject', () => {
    expect(buildContactSubject('Ny\r\nHasina', 'Backend')).toBe(
      'Portfolio contact — Ny Hasina — Backend'
    );
  });
});

describe('contactRequestSchema', () => {
  it('rejects newlines in the name for real submissions', () => {
    const parsed = contactRequestSchema.safeParse({
      name: 'Ny\nHasina',
      email: 'visitor@example.com',
      message: 'Hello',
      locale: 'en',
      website: '',
      elapsedMilliseconds: 5_000,
    });

    expect(parsed.success).toBe(false);
  });
});
