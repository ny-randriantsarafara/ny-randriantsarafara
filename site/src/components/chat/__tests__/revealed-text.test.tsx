import { render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { describe, expect, it } from 'vitest';

import { RevealedText } from '@/components/chat/revealed-text.tsx';

function renderRevealed(text: string) {
  return render(
    <LazyMotion features={domAnimation}>
      <RevealedText text={text} />
    </LazyMotion>
  );
}

describe('RevealedText', () => {
  it('exposes the reply once to assistive technology while words animate', () => {
    const { container } = renderRevealed('I maintained content APIs.');
    expect(screen.getByText('I maintained content APIs.')).toHaveClass('sr-only');
    const animated = container.querySelector('[aria-hidden="true"]');
    expect(animated).toHaveTextContent('I maintained content APIs.');
    expect(animated?.querySelectorAll('span')).toHaveLength(4);
  });

  it('shows markup in a reply as text', () => {
    const { container } = renderRevealed('<img src=x onerror=alert(1)> <b>bold</b>');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)> <b>bold</b>')).toBeInTheDocument();
  });
});
