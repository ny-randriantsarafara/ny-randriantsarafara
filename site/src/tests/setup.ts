import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: readonly number[] = [];

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

if (typeof navigator.sendBeacon !== 'function') {
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn(() => true),
  });
}

vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) satisfies MediaQueryList
);

afterEach(() => {
  cleanup();
});
