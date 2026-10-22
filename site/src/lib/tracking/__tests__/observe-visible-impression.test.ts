import { afterEach, describe, expect, it, vi } from 'vitest';

import { observeVisibleImpression } from '../observe-visible-impression.ts';

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
};

describe('observeVisibleImpression', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('waits for half visibility for one second before firing', () => {
    vi.useFakeTimers();
    const observers: ObserverRecord[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observers.push({ callback, options });
        }
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    const node = {};
    const onImpression = vi.fn();
    observeVisibleImpression(node as Element, { onImpression });
    expect(observers[0]?.options?.threshold).toEqual([0, 0.5, 1]);
    observers[0]?.callback(
      [{ isIntersecting: true, intersectionRatio: 0.4 } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    vi.advanceTimersByTime(1000);
    expect(onImpression).not.toHaveBeenCalled();
    observers[0]?.callback(
      [{ isIntersecting: true, intersectionRatio: 0.6 } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    vi.advanceTimersByTime(999);
    expect(onImpression).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onImpression).toHaveBeenCalledOnce();
  });

  it('clears the timer when visibility drops before one second', () => {
    vi.useFakeTimers();
    const observers: ObserverRecord[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observers.push({ callback, options });
        }
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    const onImpression = vi.fn();
    observeVisibleImpression({} as Element, { onImpression });
    observers[0]?.callback(
      [{ isIntersecting: true, intersectionRatio: 0.8 } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    vi.advanceTimersByTime(500);
    observers[0]?.callback(
      [{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    vi.advanceTimersByTime(1000);
    expect(onImpression).not.toHaveBeenCalled();
  });
});
