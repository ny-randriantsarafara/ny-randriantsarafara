import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Contact } from '@/components/sections/contact';

import type { ContactSectionData } from '@/types';

const contactData: ContactSectionData = {
  eyebrow: 'Next steps',
  headlinePrefix: "Let's work",
  headlineHighlight: 'together',
  description: 'Open to senior backend roles.',
  channels: [
    {
      kind: 'email',
      label: 'nyhasinavalonar@gmail.com',
      href: 'mailto:nyhasinavalonar@gmail.com',
    },
    {
      kind: 'linkedin',
      label: 'linkedin.com/in/ny-randriantsarafara',
      href: 'https://www.linkedin.com/in/ny-randriantsarafara/',
    },
  ],
  details: [
    { label: 'Location', value: 'Pontault-Combault, France' },
    { label: 'Languages', value: 'Malagasy · French · English' },
  ],
  footer: { copyright: 'Ny Hasinavalona Randriantsarafara', tagline: 'Built with care.' },
};

describe('Contact', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByText(/next steps/i)).toBeInTheDocument();
    expect(screen.getByText(/let's work/i)).toBeInTheDocument();
    expect(screen.getByText(/together/i)).toBeInTheDocument();
    expect(screen.getByText(/open to senior backend roles/i)).toBeInTheDocument();
  });

  it('renders each channel as a link with its href', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByRole('link', { name: /nyhasinavalonar@gmail.com/i })).toHaveAttribute(
      'href',
      'mailto:nyhasinavalonar@gmail.com'
    );
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ny-randriantsarafara/'
    );
  });

  it('renders each detail as a definition list entry', () => {
    render(<Contact data={contactData} />);
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Pontault-Combault, France')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('Malagasy · French · English')).toBeInTheDocument();
  });
});
