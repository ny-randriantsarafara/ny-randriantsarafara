import type { Locale } from '@portfolio/content';
import type { MouseEvent } from 'react';

declare global {
  interface Window {
    __portfolioLocaleReady?: Promise<boolean>;
  }
}

// Keep this function self-contained: it is serialized into the static document head.
function bootstrapVisitorLocale(apiUrl: string) {
  if (location.pathname !== '/') return;
  const root = document.documentElement;
  root.setAttribute('data-locale-pending', '');
  window.__portfolioLocaleReady = new Promise<boolean>((resolve) => {
    let finished = false;
    const controller = new AbortController();
    const saved = () => {
      try {
        const value = localStorage.getItem('portfolio.locale');
        return value === 'en' || value === 'fr' ? value : null;
      } catch {
        return null;
      }
    };
    const finish = (locale: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      controller.abort();
      window.removeEventListener('storage', changed);
      if (locale === 'fr') {
        try {
          location.replace('/fr' + location.search + location.hash);
          // A failed/cancelled navigation must never leave the page inaccessible.
          setTimeout(() => {
            root.removeAttribute('data-locale-pending');
            resolve(true);
          }, 1500);
          return;
        } catch {
          // Navigation can be unavailable in restricted browser contexts.
        }
      }
      root.removeAttribute('data-locale-pending');
      resolve(true);
    };
    const changed = (event: StorageEvent) => {
      if (event.key === 'portfolio.locale') {
        const value = saved();
        if (value !== null) finish(value);
      }
    };
    const watchdog = setTimeout(() => finish(saved() ?? 'en'), 1500);
    window.addEventListener('storage', changed);
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) root.removeAttribute('data-locale-pending');
    });
    try {
      const url = new URL(location.href);
      const marker = url.searchParams.get('portfolio-locale');
      if (marker !== null) {
        url.searchParams.delete('portfolio-locale');
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      }
      const preference = marker === 'en' ? 'en' : saved();
      if (preference !== null) {
        finish(preference);
        return;
      }
      const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
      for (const language of languages) {
        try {
          const canonical = Intl.getCanonicalLocales(language)[0];
          const primary = canonical?.split('-')[0];
          if (primary === 'en' || primary === 'fr') {
            finish(primary);
            return;
          }
        } catch {
          // Ignore malformed browser preferences and continue in priority order.
        }
      }
      void fetch(apiUrl.replace(/\/$/, '') + '/visitor-locale', {
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store',
      })
        .then(async (response) => (response.ok ? response.json() : null))
        .then((body: unknown) => {
          const locale =
            typeof body === 'object' && body !== null && 'locale' in body && body.locale === 'fr'
              ? 'fr'
              : 'en';
          finish(saved() ?? locale);
        })
        .catch(() => finish(saved() ?? 'en'));
    } catch {
      finish(saved() ?? 'en');
    }
  }).catch(() => {
    root.removeAttribute('data-locale-pending');
    return true;
  });
}

export function visitorLocaleScript(apiUrl: string): string {
  return `(${bootstrapVisitorLocale.toString()})(${JSON.stringify(apiUrl).replace(/</g, '\\u003c')});`;
}

export function rememberLocale(event: MouseEvent<HTMLAnchorElement>, locale: Locale): void {
  try {
    localStorage.setItem('portfolio.locale', locale);
  } catch {
    if (locale === 'en') {
      const url = new URL(event.currentTarget.href);
      if (url.pathname === '/') {
        url.searchParams.set('portfolio-locale', 'en');
        event.currentTarget.href = url.toString();
      }
    }
  }
}
