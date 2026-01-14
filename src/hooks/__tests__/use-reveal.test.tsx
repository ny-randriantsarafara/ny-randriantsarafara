import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useReveal } from '@/hooks/use-reveal';

describe('useReveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('adds the reveal class when an entry intersects', () => {
    const observe = vi.fn();
    let observerCallback: IntersectionObserverCallback | undefined;

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn((callback: IntersectionObserverCallback) => {
        observerCallback = callback;
        return { observe, disconnect: vi.fn() };
      })
    );

    function TestComponent() {
      useReveal();
      return <div className="reveal">Target</div>;
    }

    render(<TestComponent />);

    const target = screen.getByText('Target');
    expect(observe).toHaveBeenCalledWith(target);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver
      );
    });

    expect(target).toHaveClass('is-in');
  });

  it('disconnects the observer on unmount', () => {
    const disconnect = vi.fn();

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(() => {
        return { observe: vi.fn(), disconnect };
      })
    );

    function TestComponent() {
      useReveal();
      return <div className="reveal">Target</div>;
    }

    const { unmount } = render(<TestComponent />);
    unmount();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
