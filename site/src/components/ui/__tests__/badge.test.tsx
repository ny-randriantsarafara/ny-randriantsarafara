import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders a glass-panel badge by default', () => {
    render(<Badge>Available</Badge>);
    const badge = screen.getByText('Available');
    expect(badge).toHaveClass('glass-panel');
  });

  it('renders an accent dot when accent is provided', () => {
    render(<Badge accent="indigo">About</Badge>);
    const badge = screen.getByText(/about/i);
    expect(badge.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-indigo-400');
    expect(badge).toHaveClass('text-indigo-300');
  });

  it('renders a tag variant without glass-panel', () => {
    render(<Badge variant="tag">Tech</Badge>);
    const badge = screen.getByText('Tech');
    expect(badge).not.toHaveClass('glass-panel');
    expect(badge).toHaveClass('rounded-full');
  });
});
