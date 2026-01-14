import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from '@/components/ui/card';

describe('Card', () => {
  it('renders children with base styles', () => {
    render(<Card>Content</Card>);

    const card = screen.getByText('Content');
    expect(card).toHaveClass('rounded-3xl');
    expect(card).toHaveClass('bg-paper');
  });

  it('adds hover styles when enabled', () => {
    render(<Card hover>Hover me</Card>);

    const card = screen.getByText('Hover me');
    expect(card).toHaveClass('hover:border-ink/20');
  });
});
