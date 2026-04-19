import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from '@/components/layout/footer';

describe('Footer', () => {
  it('renders copyright, location, tagline, and back-to-top link', () => {
    render(
      <Footer
        data={{ copyright: 'Ny Hasinavalona Randriantsarafara', tagline: 'Built with care.' }}
        location="Pontault-Combault, FR"
      />
    );

    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year}`)).toBeInTheDocument();
    expect(screen.getByText('Ny Hasinavalona Randriantsarafara')).toBeInTheDocument();
    expect(screen.getByText('Pontault-Combault, FR')).toBeInTheDocument();
    expect(screen.getByText('Built with care.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to top/i })).toHaveAttribute('href', '#hero');
  });
});
