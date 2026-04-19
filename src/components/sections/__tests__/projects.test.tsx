import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Projects } from '@/components/sections/projects';

import type { ProjectsSectionData } from '@/types';

const projectsData: ProjectsSectionData = {
  eyebrow: 'Featured work',
  headlinePrefix: 'Selected',
  headlineHighlight: 'case studies',
  items: [
    {
      title: 'Eurosport / HBO Max API',
      role: 'Software Engineer',
      year: '2024—Present',
      company: 'WBD',
      description: 'GraphQL API.',
      tech: ['TypeScript', 'GraphQL'],
    },
    {
      title: 'Media platform',
      role: 'Software Engineer',
      year: '2023—2024',
      company: 'Euronews',
      description: '~2M DAU.',
      tech: ['TypeScript'],
    },
  ],
  footnote: 'Detailed case studies available on request.',
};

describe('Projects', () => {
  it('renders the eyebrow and headline', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText(/featured work/i)).toBeInTheDocument();
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
    expect(screen.getAllByText(/case studies/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders each project with title, year, role, company, description, tech', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText('Eurosport / HBO Max API')).toBeInTheDocument();
    expect(screen.getByText('GraphQL API.')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Media platform')).toBeInTheDocument();
    expect(screen.getByText('~2M DAU.')).toBeInTheDocument();
  });

  it('renders the footnote', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText(/detailed case studies available on request/i)).toBeInTheDocument();
  });
});
