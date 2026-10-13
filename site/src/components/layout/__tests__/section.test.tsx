import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Section } from '@/components/layout/section';

describe('Section', () => {
  it('renders a section with the given id and scroll offset', () => {
    const { container } = render(
      <Section id="about">
        <p>About content</p>
      </Section>
    );

    const section = container.querySelector('section');
    expect(section).toHaveAttribute('id', 'about');
    expect(section).toHaveClass('scroll-mt-24');
  });

  it('merges additional class names', () => {
    const { container } = render(
      <Section id="hero" className="custom-class">
        Content
      </Section>
    );

    expect(container.querySelector('section')).toHaveClass('custom-class');
  });
});
