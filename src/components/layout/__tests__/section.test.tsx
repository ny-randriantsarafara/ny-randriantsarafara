import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Section } from '@/components/layout/section';

describe('Section', () => {
  it('applies the sand variant styling', () => {
    const { container } = render(
      <Section id="sand" variant="sand">
        Sand
      </Section>
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('bg-sand/35');
  });

  it('applies the dark variant styling and inner spacing', () => {
    const { container } = render(
      <Section id="dark" variant="dark">
        Dark
      </Section>
    );

    const section = container.querySelector('section');
    const inner = container.querySelector('section > div');

    expect(section).toHaveClass('bg-ink');
    expect(section).toHaveClass('text-paper');
    expect(inner).toHaveClass('py-14');
  });
});
