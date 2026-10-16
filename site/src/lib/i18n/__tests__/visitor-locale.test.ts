import { afterEach, describe, expect, it, vi } from 'vitest';

import { visitorLocaleScript } from '../visitor-locale.ts';

let ready: Promise<boolean> | undefined;
afterEach(async () => {
  await vi.runAllTimersAsync();
  await ready;
  ready = undefined;
  delete window.__portfolioLocaleReady;
  document.documentElement.removeAttribute('data-locale-pending');
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function run(languages: string[], language = 'en-US', saved?: string, hang = false) {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { languages, language });
  const replace = vi.fn();
  vi.stubGlobal('location', {
    pathname: '/',
    href: 'https://example.com/',
    search: '',
    hash: '',
    replace,
  });
  const fetchImpl = vi.fn<typeof fetch>(() =>
    hang ? new Promise(() => {}) : Promise.resolve(Response.json({ locale: 'fr' }))
  );
  vi.stubGlobal('fetch', fetchImpl);
  if (saved !== undefined) localStorage.setItem('portfolio.locale', saved);
  // Execute the emitted bootstrap, rather than asserting source text.
  new Function(visitorLocaleScript('https://api.example.com'))();
  ready = window.__portfolioLocaleReady;
  return { replace, fetchImpl };
}

describe('early visitor locale bootstrap', () => {
  it('keeps tracking pending during a no-op redirect and enables it when English is revealed', async () => {
    const { replace } = run(['fr-FR']);
    let trackingReady: boolean | undefined;
    void ready?.then((value) => {
      trackingReady = value;
    });
    expect(replace).toHaveBeenCalledWith('/fr');
    await vi.advanceTimersByTimeAsync(1499);
    expect(trackingReady).toBeUndefined();
    expect(document.documentElement.hasAttribute('data-locale-pending')).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(await ready).toBe(true);
    expect(trackingReady).toBe(true);
    expect(document.documentElement.hasAttribute('data-locale-pending')).toBe(false);
  });
  it.each([
    { languages: ['mg-MG', 'en-GB', 'fr'], expected: 'en' },
    { languages: ['de-DE', 'fr-CA', 'en'], expected: 'fr' },
    { languages: ['bad_locale', 'fr'], expected: 'fr' },
    { languages: ['en-US'], saved: 'fr', expected: 'fr' },
    { languages: ['fr'], saved: 'en', expected: 'en' },
    { languages: [], expected: 'en' },
  ])(
    'prioritizes valid saved and ordered supported browser preferences: %j',
    async ({ languages, saved, expected }) => {
      const { replace, fetchImpl } = run(languages, 'en-US', saved);
      if (expected === 'fr') await vi.advanceTimersByTimeAsync(1500);
      expect(await ready).toBe(true);
      expect(replace.mock.calls).toEqual(expected === 'fr' ? [['/fr']] : []);
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  );
  it('uses navigator.language when the languages array is empty', async () => {
    const { replace, fetchImpl } = run([], 'fr-FR');
    await vi.advanceTimersByTimeAsync(1500);
    expect(await ready).toBe(true);
    expect(replace).toHaveBeenCalledWith('/fr');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('gates interaction while country is pending and resolves at 1500ms', async () => {
    const { replace } = run(['mg-MG'], 'mg-MG', undefined, true);
    expect(document.documentElement.hasAttribute('data-locale-pending')).toBe(true);
    await vi.advanceTimersByTimeAsync(1499);
    expect(document.documentElement.hasAttribute('data-locale-pending')).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(await ready).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-locale-pending')).toBe(false);
  });
  it('new saved manual preference overrides a pending country result', async () => {
    const { replace } = run(['mg-MG']);
    localStorage.setItem('portfolio.locale', 'en');
    window.dispatchEvent(new StorageEvent('storage', { key: 'portfolio.locale', newValue: 'en' }));
    expect(await ready).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(replace).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-locale-pending')).toBe(false);
  });
});
