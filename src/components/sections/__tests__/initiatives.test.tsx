import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Initiatives } from '@/components/sections/initiatives';

import type { InitiativesSectionData } from '@/types';

const initiativesData: InitiativesSectionData = {
  eyebrow: 'R&D & engineering initiatives',
  headlinePrefix: 'Side',
  headlineHighlight: 'investments',
  description: 'Personal R&D.',
  items: [
    {
      icon: 'brain-circuit',
      title: 'Visa Insight',
      subtitle: 'NLP & AI',
      description: 'Multilingual extraction.',
      tags: ['NLP', 'CI/CD'],
    },
    {
      icon: 'map',
      title: 'Lalana',
      subtitle: 'Geospatial',
      description: 'Routing backend.',
      tags: ['OSM'],
    },
  ],
};

describe('Initiatives', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Initiatives data={initiativesData} />);
    expect(screen.getByText(/r&d & engineering initiatives/i)).toBeInTheDocument();
    expect(screen.getByText(/side/i)).toBeInTheDocument();
    expect(screen.getByText(/investments/i)).toBeInTheDocument();
    expect(screen.getByText(/personal r&d/i)).toBeInTheDocument();
  });

  it('renders each initiative with title, subtitle, description, and tags', () => {
    render(<Initiatives data={initiativesData} />);
    expect(screen.getByText('Visa Insight')).toBeInTheDocument();
    expect(screen.getByText('NLP & AI')).toBeInTheDocument();
    expect(screen.getByText('Multilingual extraction.')).toBeInTheDocument();
    expect(screen.getByText('NLP')).toBeInTheDocument();
    expect(screen.getByText('Lalana')).toBeInTheDocument();
    expect(screen.getByText('Geospatial')).toBeInTheDocument();
    expect(screen.getByText('Routing backend.')).toBeInTheDocument();
  });
});
