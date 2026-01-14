import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders default variant styles', () => {
    render(<Badge>Default</Badge>);

    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('border-ink/10');
    expect(badge).toHaveClass('bg-paper/70');
  });

  it('renders accent variant styles', () => {
    render(<Badge variant="accent">Accent</Badge>);

    const badge = screen.getByText('Accent');
    expect(badge).toHaveClass('bg-accent/10');
    expect(badge).toHaveClass('text-accent');
  });
});
