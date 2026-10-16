import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from '@/components/layout/footer';

describe('Footer', () => {
  it('renders copyright, location, privacy and back-to-top links', () => {
    render(
      <Footer
        data={{
          copyright: 'Ny Hasinavalona Randriantsarafara',
          location: 'Pontault-Combault, FR',
          backToTop: 'Back to top',
        }}
        privacyHref="/privacy"
        privacyLabel="Privacy policy"
      />
    );

    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year}`)).toBeInTheDocument();
    expect(screen.getByText('Ny Hasinavalona Randriantsarafara')).toBeInTheDocument();
    expect(screen.getByText('Pontault-Combault, FR')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to top/i })).toHaveAttribute('href', '#hero');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy'
    );
  });
});
