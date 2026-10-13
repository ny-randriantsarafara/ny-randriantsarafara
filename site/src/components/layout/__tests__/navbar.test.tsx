import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Navbar } from '@/components/layout/navbar';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

vi.mock('next-themes', () => {
  const setTheme = vi.fn();
  return {
    useTheme: () => ({ theme: 'light', setTheme, themes: ['light', 'dark'] }),
  };
});

vi.mock('@/hooks', () => ({
  useScrollSpy: () => 'hero',
}));

describe('Navbar', () => {
  const dictionary = dictionaryFor('en');

  it('renders all nav items with their labels', () => {
    render(<Navbar locale="en" dictionary={dictionary} />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '#hero');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('link', { name: /work/i })).toHaveAttribute('href', '#projects');
    expect(screen.getByRole('link', { name: /experience/i })).toHaveAttribute(
      'href',
      '#experience'
    );
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '#contact');
    expect(screen.getByRole('link', { name: /switch to french/i })).toHaveAttribute('href', '/fr');
  });

  it('marks the active section with aria-current', () => {
    render(<Navbar locale="en" dictionary={dictionary} />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /about/i })).not.toHaveAttribute('aria-current');
  });

  it('exposes a theme toggle button with an accessible label', async () => {
    render(<Navbar locale="en" dictionary={dictionary} />);
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    await userEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });
});
