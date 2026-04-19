import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { About } from '@/components/sections/about';

import type { AboutSectionData } from '@/types';

const aboutData: AboutSectionData = {
  eyebrow: 'About',
  headlinePrefix: 'Bridging',
  headlineHighlight: 'reliability and clarity',
  headlineSuffix: 'in cloud systems.',
  journey: {
    title: 'My journey',
    paragraphs: ['I am a Senior Backend Engineer.', 'Design-then-implement.'],
  },
  stat: { value: '8+', label: 'Years building production systems' },
  coreStack: { title: 'Core stack', items: ['TypeScript', 'AWS'] },
  features: [
    { icon: 'cloud', title: 'Cloud & Infrastructure', description: 'AWS, Terraform.' },
    { icon: 'server', title: 'Backend & APIs', description: 'GraphQL, REST.' },
  ],
};

describe('About', () => {
  it('renders the eyebrow, headline parts, journey paragraphs, stat, core stack, and features', () => {
    render(<About data={aboutData} />);

    expect(screen.getByText(/about/i)).toBeInTheDocument();
    expect(screen.getByText(/bridging/i)).toBeInTheDocument();
    expect(screen.getByText(/reliability and clarity/i)).toBeInTheDocument();
    expect(screen.getByText(/in cloud systems/i)).toBeInTheDocument();
    expect(screen.getByText('My journey')).toBeInTheDocument();
    expect(screen.getByText('I am a Senior Backend Engineer.')).toBeInTheDocument();
    expect(screen.getByText('Design-then-implement.')).toBeInTheDocument();
    expect(screen.getByText('8+')).toBeInTheDocument();
    expect(screen.getByText('Years building production systems')).toBeInTheDocument();
    expect(screen.getByText('Core stack')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Cloud & Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Backend & APIs')).toBeInTheDocument();
  });
});
