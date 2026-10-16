import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { About } from '@/components/sections/about';

import type { AboutSectionData } from '@/types';

const aboutData: AboutSectionData = {
  eyebrow: 'About',
  headlinePrefix: 'How',
  headlineHighlight: 'I got here',
  journeyParagraphs: ['I started in 2018.', 'Today I work at Eurosport.'],
  featuresTitle: 'What I work on',
  features: [
    { icon: 'cloud', title: 'Cloud & Infrastructure', description: 'AWS, Terraform.' },
    { icon: 'server', title: 'Backend & APIs', description: 'GraphQL, REST.' },
  ],
  technologiesTitle: 'Technologies',
  usageHeader: 'Use',
  technologiesHeader: 'Technologies',
  technologies: [
    { usage: 'Backend', technologies: ['Node.js', 'TypeScript'] },
    { usage: 'AWS services', technologies: ['Lambda'] },
  ],
};

describe('About', () => {
  it('renders the headline, the journey and the capabilities', () => {
    render(<About data={aboutData} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('How I got here');
    expect(screen.getByText('I started in 2018.')).toBeInTheDocument();
    expect(screen.getByText('Today I work at Eurosport.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'What I work on' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Cloud & Infrastructure' })
    ).toBeInTheDocument();
    expect(screen.getByText('GraphQL, REST.')).toBeInTheDocument();
  });

  it('renders the technologies table, one row per usage', () => {
    render(<About data={aboutData} />);

    expect(screen.getByRole('columnheader', { name: 'Use' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Backend' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Node.js, TypeScript' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Lambda' })).toBeInTheDocument();
  });

  it('leaves out an empty technologies table', () => {
    render(<About data={{ ...aboutData, technologies: [] }} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
