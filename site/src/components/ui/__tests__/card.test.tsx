import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from '@/components/ui/card';

describe('Card', () => {
  it('renders default variant styles', () => {
    render(<Card>Content</Card>);

    const card = screen.getByText('Content');
    expect(card).toHaveClass('rounded-3xl');
    expect(card).toHaveClass('bg-white/70');
  });

  it('renders glass variant with the glass-panel class', () => {
    render(<Card variant="glass">Glass</Card>);

    expect(screen.getByText('Glass')).toHaveClass('glass-panel');
  });

  it('adds the hover lift transition when hover is true', () => {
    render(<Card hover>Hover</Card>);

    expect(screen.getByText('Hover')).toHaveClass('hover:-translate-y-0.5');
  });
});
