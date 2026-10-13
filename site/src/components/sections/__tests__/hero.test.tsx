import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Hero } from '@/components/sections/hero';

import type { HeroSectionData } from '@/types';

const heroData: HeroSectionData = {
  tagline: 'Pontault-Combault, France · AWS · Terraform · TypeScript',
  availabilityBadge: 'EU Blue Card · Available for new roles',
  headlinePrefix: 'Crafting cloud systems',
  headlineHighlight: 'built to last',
  headlineSuffix: 'not to impress.',
  subheadline: 'Senior Backend & Cloud Engineer.',
  primaryCta: { label: 'Explore work', href: '#projects' },
  secondaryCta: { label: 'Resume', href: '/documents/resume.pdf' },
  email: 'nyhasinavalonar@gmail.com',
  snapshot: {
    role: 'Senior Backend & Cloud Engineer',
    location: 'Pontault-Combault, FR',
    stats: [{ value: '8+', label: 'Years experience' }],
    stack: ['TypeScript', 'AWS', 'Terraform'],
  },
};

describe('Hero', () => {
  it('renders the headline parts and CTAs', () => {
    render(<Hero data={heroData} />);
    expect(screen.getByText(/crafting cloud systems/i)).toBeInTheDocument();
    expect(screen.getByText(/built to last/i)).toBeInTheDocument();
    expect(screen.getByText(/not to impress/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore work/i })).toHaveAttribute(
      'href',
      '#projects'
    );
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute(
      'href',
      '/documents/resume.pdf'
    );
  });

  it('renders the availability badge', () => {
    render(<Hero data={heroData} />);
    expect(screen.getByText(/eu blue card/i)).toBeInTheDocument();
  });

  it('renders the snapshot role, location, stats, and stack', () => {
    render(<Hero data={heroData} />);
    expect(screen.getAllByText(/senior backend & cloud engineer/i).length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByText('Pontault-Combault, FR')).toBeInTheDocument();
    expect(screen.getByText('8+')).toBeInTheDocument();
    expect(screen.getByText('Years experience')).toBeInTheDocument();
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThanOrEqual(1);
  });
});
