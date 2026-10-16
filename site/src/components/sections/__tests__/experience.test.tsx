import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Experience } from '@/components/sections/experience';

import type { ExperienceSectionData } from '@/types';

const experienceData: ExperienceSectionData = {
  eyebrow: 'Background',
  headlinePrefix: 'Professional',
  headlineHighlight: 'experience',
  technologiesLabel: 'Technologies:',
  items: [
    {
      company: 'Objectware, Warner Bros. Discovery / Eurosport',
      role: 'Software Engineer',
      period: 'Since 2024',
      location: '',
      summary: 'I develop GraphQL APIs.',
      bullets: ['Migrated to Terraform.', 'Extended GraphQL API.'],
      tech: ['TypeScript', 'Lambda'],
    },
    {
      company: 'HEI',
      role: 'Part-time computer science teacher',
      period: 'January 2022 to March 2023',
      location: '',
      summary: 'I taught a few hours a week.',
      bullets: [],
      tech: [],
    },
  ],
};

describe('Experience', () => {
  it('renders the eyebrow and the headline without a trailing full stop', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /^Professional experience$/
    );
  });

  it('renders each role with its summary, bullets and technologies line', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText('Objectware, Warner Bros. Discovery / Eurosport')).toBeInTheDocument();
    expect(screen.getByText('Since 2024')).toBeInTheDocument();
    expect(screen.getByText('I develop GraphQL APIs.')).toBeInTheDocument();
    expect(screen.getByText('Migrated to Terraform.')).toBeInTheDocument();
    expect(screen.getByText(/TypeScript, Lambda\./)).toHaveTextContent(
      'Technologies: TypeScript, Lambda.'
    );
  });

  it('leaves out the list and the technologies line when a role has none', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText('I taught a few hours a week.')).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(screen.getAllByText('Technologies:')).toHaveLength(1);
  });
});
