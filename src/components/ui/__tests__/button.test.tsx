import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders a button element by default with the primary variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('rounded-full');
  });

  it('renders an anchor when href is provided', () => {
    render(<Button href="#projects">Explore</Button>);
    const link = screen.getByRole('link', { name: /explore/i });
    expect(link).toHaveAttribute('href', '#projects');
  });

  it('opens external links in a new tab with security attributes', () => {
    render(
      <Button href="https://example.com" external>
        External
      </Button>
    );
    const link = screen.getByRole('link', { name: /external/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('marks downloadable links with the download attribute', () => {
    render(
      <Button href="/documents/resume.pdf" download>
        Resume
      </Button>
    );
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('download');
  });

  it('applies the glass-panel class for the glass variant', () => {
    render(<Button variant="glass">Glass</Button>);
    expect(screen.getByRole('button', { name: /glass/i })).toHaveClass('glass-panel');
  });
});
