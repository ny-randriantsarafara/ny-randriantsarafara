import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders a button element by default', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);

    expect(button).toHaveClass('bg-ink');
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders a link when href is provided', () => {
    render(
      <Button href="#contact" variant="secondary">
        Contact
      </Button>
    );

    const link = screen.getByRole('link', { name: /contact/i });
    expect(link).toHaveAttribute('href', '#contact');
    expect(link).toHaveClass('border-ink/15');
  });
});
