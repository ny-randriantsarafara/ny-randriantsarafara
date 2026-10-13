import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Experience } from '@/components/sections/experience';

import type { ExperienceSectionData } from '@/types';

const experienceData: ExperienceSectionData = {
  eyebrow: 'Career path',
  headlinePrefix: 'Professional',
  headlineHighlight: 'experience',
  description: '8+ years.',
  items: [
    {
      company: 'Warner Bros. Discovery (Eurosport)',
      role: 'Software Engineer',
      period: 'Mar 2024 — Present',
      location: 'Issy-les-Moulineaux, FR',
      bullets: ['Migrated to Terraform.', 'Extended GraphQL API.'],
      tech: ['TypeScript', 'AWS'],
    },
    {
      company: 'Euronews',
      role: 'Software Engineer',
      period: 'Mar 2023 — Mar 2024',
      location: 'Lyon, FR',
      bullets: ['~2M DAU.'],
      tech: ['Node.js'],
    },
  ],
  earlierLine: 'Earlier roles available on request.',
};

describe('Experience', () => {
  it('renders the eyebrow, headline, and description', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText(/career path/i)).toBeInTheDocument();
    expect(screen.getByText(/professional/i)).toBeInTheDocument();
    expect(screen.getByText(/experience/i)).toBeInTheDocument();
    expect(screen.getByText(/8\+ years/i)).toBeInTheDocument();
  });

  it('renders each role with company, period, location, bullets, tech', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText('Warner Bros. Discovery (Eurosport)')).toBeInTheDocument();
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mar 2024 — Present')).toBeInTheDocument();
    expect(screen.getByText('Issy-les-Moulineaux, FR')).toBeInTheDocument();
    expect(screen.getByText('Migrated to Terraform.')).toBeInTheDocument();
    expect(screen.getByText('Extended GraphQL API.')).toBeInTheDocument();
    expect(screen.getByText('Euronews')).toBeInTheDocument();
    expect(screen.getByText('~2M DAU.')).toBeInTheDocument();
  });

  it('renders the earlierLine below the timeline', () => {
    render(<Experience data={experienceData} />);
    expect(screen.getByText(/earlier roles available on request/i)).toBeInTheDocument();
  });
});
