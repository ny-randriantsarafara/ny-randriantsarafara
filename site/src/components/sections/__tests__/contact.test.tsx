import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Contact } from '@/components/sections/contact';

import type { ContactSectionData } from '@/types';

const contactData: ContactSectionData = {
  eyebrow: 'Contact',
  headlinePrefix: 'Shall we talk',
  headlineHighlight: 'about your project?',
  description: 'Send me a few lines about your project.',
  channelsTitle: 'Contact details',
  channels: [
    {
      kind: 'email',
      kindLabel: 'Email',
      label: 'nyhasinavalonar@gmail.com',
      href: 'mailto:nyhasinavalonar@gmail.com',
    },
    {
      kind: 'linkedin',
      kindLabel: 'LinkedIn',
      label: 'linkedin.com/in/ny-randriantsarafara',
      href: 'https://www.linkedin.com/in/ny-randriantsarafara/',
    },
  ],
};

describe('Contact', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Contact locale="en" data={contactData} />);
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /^Shall we talk about your project\?$/
    );
    expect(screen.getByText('Send me a few lines about your project.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Contact details' })).toBeInTheDocument();
  });

  it('renders each channel as a link with its href', () => {
    render(<Contact locale="en" data={contactData} />);
    expect(screen.getByRole('link', { name: /nyhasinavalonar@gmail.com/i })).toHaveAttribute(
      'href',
      'mailto:nyhasinavalonar@gmail.com'
    );
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ny-randriantsarafara/'
    );
  });

  it('shows no personal details list', () => {
    const { container } = render(<Contact locale="en" data={contactData} />);
    expect(container.querySelector('dl')).toBeNull();
  });
});
