import { describe, expect, it, vi } from 'vitest';

import { sendContactMessage } from '@/lib/contact/send-contact-message.ts';

const payload = {
  name: 'Alex',
  email: 'alex@example.com',
  company: '',
  message: 'Hello',
  locale: 'en' as const,
  topic: 'Hiring',
  elapsedMilliseconds: 5000,
  website: '',
};

describe('sendContactMessage', () => {
  it('returns invalid for HTTP 400 responses', async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
    );
    const result = await sendContactMessage({
      payload,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    expect(result.kind).toBe('invalid');
  });

  it('returns failed for network errors', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await sendContactMessage({
      payload,
      apiUrl: 'https://api.example.com',
      fetchFn,
    });
    expect(result.kind).toBe('failed');
  });
});
