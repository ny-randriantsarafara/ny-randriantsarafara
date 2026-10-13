import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollSpy } from '@/hooks/use-scroll-spy';

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class FakeObserver implements IntersectionObserver {
  static lastInstance: FakeObserver | null = null;

  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly callback: ObserverCallback;
  readonly observed: Element[] = [];

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    FakeObserver.lastInstance = this;
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entries: IntersectionObserverEntry[]): void {
    this.callback(entries);
  }
}

beforeEach(() => {
  FakeObserver.lastInstance = null;
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setupSections(ids: readonly string[]): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  for (const id of ids) {
    const section = document.createElement('section');
    section.id = id;
    document.body.appendChild(section);
  }
}

function makeEntry(id: string, ratio: number): IntersectionObserverEntry {
  const element = document.createElement('section');
  element.id = id;
  return {
    target: element,
    isIntersecting: ratio > 0,
    intersectionRatio: ratio,
    boundingClientRect: element.getBoundingClientRect(),
    intersectionRect: element.getBoundingClientRect(),
    rootBounds: null,
    time: 0,
  };
}

describe('useScrollSpy', () => {
  it('returns the first section id by default', () => {
    setupSections(['hero', 'about']);
    const { result } = renderHook(() => useScrollSpy(['hero', 'about']));
    expect(result.current).toBe('hero');
  });

  it('returns the most-intersecting section id when entries change', () => {
    setupSections(['hero', 'about']);
    const { result, rerender } = renderHook(() => useScrollSpy(['hero', 'about']));

    const observer = FakeObserver.lastInstance;
    if (!observer) throw new Error('Observer not registered');

    observer.trigger([makeEntry('hero', 0.1), makeEntry('about', 0.9)]);
    rerender();

    expect(result.current).toBe('about');
  });
});
