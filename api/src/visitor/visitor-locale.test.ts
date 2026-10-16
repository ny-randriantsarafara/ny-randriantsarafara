import { afterEach, describe, expect, it, vi } from 'vitest';

import { createVisitorLocaleResolver } from './visitor-locale.ts';

afterEach(() => vi.useRealTimers());

describe('visitor country fallback', () => {
  it.each(
    'BE BF BI BJ BL CA CD CF CG CH CI CM DJ DZ FR GA GF GN GP GQ HT KM LB LU MA MC MF MG ML MQ MR MU NC NE PF PM RE RW SC SN TD TG TN VU WF YT'.split(
      ' '
    )
  )('uses French for %s', async (country) => {
    const resolve = createVisitorLocaleResolver(async () =>
      Response.json({ ip: '8.8.8.8', country })
    );
    expect(await resolve('8.8.8.8')).toBe('fr');
  });
  it('uses the public IPv6 address and only default provider fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ country: 'MG' }));
    expect(await createVisitorLocaleResolver(fetchImpl)('2606:4700:4700::1111')).toBe('fr');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.country.is/2606:4700:4700::1111');
  });
  it.each([
    '',
    '0.0.0.0',
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.1.1',
    '100.64.0.1',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    'not-an-ip',
  ])('does not disclose local or invalid %s', async (address) => {
    const fetchImpl = vi.fn<typeof fetch>();
    expect(await createVisitorLocaleResolver(fetchImpl)(address)).toBe('en');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it.each([{ country: 'US' }, { country: null }, {}, { country: 'fr' }, { country: 12 }])(
    'defaults safely for %j',
    async (body) => {
      expect(await createVisitorLocaleResolver(async () => Response.json(body))('8.8.8.8')).toBe(
        'en'
      );
    }
  );
  it.each([429, 500])('does not retry status %i', async (status) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('', { status }));
    expect(await createVisitorLocaleResolver(fetchImpl)('8.8.8.8')).toBe('en');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('swallows fetch and malformed JSON faults', async () => {
    expect(
      await createVisitorLocaleResolver(async () => {
        throw new Error('private request URL');
      })('8.8.8.8')
    ).toBe('en');
    expect(await createVisitorLocaleResolver(async () => new Response('{'))('8.8.8.8')).toBe('en');
  });
  it.each(['fetch', 'body'])('bounds a hanging %s at one second', async (stage) => {
    vi.useFakeTimers();
    const fetchImpl: typeof fetch =
      stage === 'fetch'
        ? () => new Promise(() => {})
        : async () => new Response(new ReadableStream({ start() {} }));
    const result = createVisitorLocaleResolver(fetchImpl)('8.8.8.8');
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBe('en');
  });
});
