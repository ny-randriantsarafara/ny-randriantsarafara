import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConversationBridgeProvider } from '@/components/providers';
import { Projects } from '@/components/sections/projects';

import { ConversationSpy } from './conversation-spy.tsx';

import type { ProjectsSectionData } from '@/types';

const projectsData: ProjectsSectionData = {
  eyebrow: 'Professional projects',
  headlinePrefix: 'A few projects',
  headlineHighlight: 'to explore in detail',
  introduction: 'Choose a project.',
  caseStudyLabel: 'The project in detail',
  items: [
    {
      title: 'Eurosport API',
      role: 'Software Engineer',
      year: 'Since 2024',
      company: 'Eurosport',
      description: 'GraphQL API.',
      caseStudy: 'I develop content APIs.\n\nI migrated the image data.',
      followUpQuestion: 'How did you prepare the data migration?',
      tech: ['TypeScript', 'GraphQL'],
    },
    {
      title: 'Media platform',
      role: 'Software Engineer',
      year: '2023 to 2024',
      company: 'Euronews',
      description: 'Tests and APIs.',
      caseStudy: null,
      followUpQuestion: null,
      tech: ['TypeScript'],
    },
  ],
};

describe('Projects', () => {
  it('renders the headline with the introduction under it', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText(/professional projects/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'A few projects to explore in detail'
    );
    expect(screen.getByText('Choose a project.')).toBeInTheDocument();
  });

  it('renders each project with its summary and technologies', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getByText('Eurosport API')).toBeInTheDocument();
    expect(screen.getByText('GraphQL API.')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Media platform')).toBeInTheDocument();
  });

  it('keeps the case study in a disclosure only when the project has one', () => {
    render(<Projects data={projectsData} />);
    expect(screen.getAllByText('The project in detail')).toHaveLength(1);
    expect(screen.getByText('I migrated the image data.')).toBeInTheDocument();
  });

  it('asks the follow-up question in the conversation', async () => {
    const onRequest = vi.fn();
    render(
      <ConversationBridgeProvider>
        <ConversationSpy onRequest={onRequest} />
        <Projects data={projectsData} />
      </ConversationBridgeProvider>
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'How did you prepare the data migration?' })
    );

    expect(onRequest).toHaveBeenCalledWith({
      kind: 'ask',
      question: 'How did you prepare the data migration?',
    });
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
