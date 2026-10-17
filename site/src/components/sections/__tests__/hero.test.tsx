import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConversationBridgeProvider } from '@/components/providers';
import { Hero } from '@/components/sections/hero';

import { ConversationSpy } from './conversation-spy.tsx';

import type { HeroSectionData } from '@/types';

const heroData: HeroSectionData = {
  headlinePrefix: 'Let’s talk',
  headlineHighlight: 'backend.',
  paragraphs: ['I develop APIs with Node.js.', 'Ask a question to find out more.'],
  primaryCta: { label: 'View projects', href: '#projects' },
  askLabel: 'Ask me a question',
  facts: [
    { label: 'Role', value: 'Senior Backend Engineer' },
    { label: 'Experience', value: 'Software development since 2018' },
  ],
};

describe('Hero', () => {
  it('renders the headline, the overview paragraphs and the links', () => {
    render(<Hero data={heroData} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Let’s talk backend.');
    expect(screen.getByText('I develop APIs with Node.js.')).toBeInTheDocument();
    expect(screen.getByText('Ask a question to find out more.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view projects/i })).toHaveAttribute(
      'href',
      '#projects'
    );
    expect(screen.queryByRole('link', { name: /download my cv/i })).not.toBeInTheDocument();
  });

  it('lists the short facts as label and value pairs', () => {
    const { container } = render(<Hero data={heroData} />);
    const list = container.querySelector('dl');
    if (list === null) {
      throw new Error('Expected the short facts list.');
    }
    expect(within(list).getByText('Role')).toBeInTheDocument();
    expect(within(list).getByText('Senior Backend Engineer')).toBeInTheDocument();
    expect(within(list).getByText('Software development since 2018')).toBeInTheDocument();
  });

  it('asks the conversation to open the input', async () => {
    const onRequest = vi.fn();
    render(
      <ConversationBridgeProvider>
        <ConversationSpy onRequest={onRequest} />
        <Hero data={heroData} />
      </ConversationBridgeProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /ask me a question/i }));

    expect(onRequest).toHaveBeenCalledWith({ kind: 'compose' });
  });
});
