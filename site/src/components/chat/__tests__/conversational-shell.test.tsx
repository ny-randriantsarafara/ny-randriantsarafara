import { activePublicationFixture, contentFixture } from '@portfolio/content/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConversationalShell } from '@/components/chat/conversational-shell.tsx';
import { ThemeProvider } from '@/components/providers';
import { sendChatMessage } from '@/lib/chat/send-chat-message.ts';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

vi.mock('@/lib/publication/load-publication-client.ts', () => ({
  loadPublicationClient: vi.fn(async () => activePublicationFixture),
  schedulePublicationPrefetch: vi.fn(),
}));

vi.mock('@/lib/chat/send-chat-message.ts', () => ({
  sendChatMessage: vi.fn(async () => ({
    kind: 'api',
    response: {
      mode: 'scripted',
      publicationId: activePublicationFixture.publicationId,
      reply: {
        text: 'Scripted answer',
        answerSlugs: ['journey'],
        blocks: [{ type: 'timeline' }],
        suggestions: ['Follow up'],
        outcome: 'answered',
      },
    },
  })),
}));

vi.mock('@/hooks/use-scroll-spy.ts', () => ({
  useScrollSpy: () => 'hero',
}));

describe('ConversationalShell', () => {
  it('sends a starter and shows the answer text', async () => {
    const user = userEvent.setup();
    const welcome = renderShell();
    const starter = welcome.starters[0]?.question;
    if (starter === undefined) {
      throw new Error('Expected a starter question in the fixture');
    }
    await user.click(screen.getByRole('button', { name: starter }));
    expect(await screen.findByRole('log')).toHaveTextContent('Scripted answer');
    expect(screen.getByRole('log')).toHaveTextContent('Prepared answer from my published content.');
  });

  it('says when an answer was given locally and why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      kind: 'fallback',
      failure: 'timeout',
      response: {
        mode: 'scripted',
        publicationId: activePublicationFixture.publicationId,
        reply: {
          text: 'Local answer',
          answerSlugs: ['journey'],
          blocks: [],
          suggestions: [],
          outcome: 'answered',
        },
      },
    });
    const user = userEvent.setup();
    renderShell();
    await user.type(screen.getByRole('textbox'), 'Tell me about your background{Enter}');
    const log = await screen.findByRole('log');
    expect(await within(log).findByText('Local answer')).toBeInTheDocument();
    expect(log).toHaveTextContent('Answered locally while the chat service is unavailable.');
    expect(log.querySelector('[data-fallback="timeout"]')).not.toBeNull();
    expect(warn).toHaveBeenCalledWith('Chat API failed (timeout); answered locally.');
    warn.mockRestore();
  });

  it('shows an unavailability reply without claiming a source', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      kind: 'fallback',
      failure: 'network',
      response: {
        mode: 'scripted',
        publicationId: activePublicationFixture.publicationId,
        reply: {
          text: 'The chat service is unavailable right now.',
          answerSlugs: [],
          blocks: [],
          suggestions: [],
          outcome: 'temporarily_unavailable',
        },
      },
    });
    const user = userEvent.setup();
    renderShell();
    await user.type(screen.getByRole('textbox'), 'Something unusual{Enter}');
    const log = await screen.findByRole('log');
    expect(
      await within(log).findByText('The chat service is unavailable right now.')
    ).toBeInTheDocument();
    expect(log).not.toHaveTextContent('Answered locally');
    expect(log).not.toHaveTextContent('Prepared answer');
    expect(log.querySelector('[data-outcome="temporarily_unavailable"]')).not.toBeNull();
    warn.mockRestore();
  });

  it('toggles quick view from the header control', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /quick view/i }));
    expect(screen.getByRole('link', { name: /explore work/i })).toBeInTheDocument();
  });
});

function renderShell() {
  const welcome = buildWelcomeData(contentFixture, 'en', null);
  render(
    <ThemeProvider>
      <>
        <ConversationalShell
          locale="en"
          dictionary={dictionaryFor('en')}
          welcome={welcome}
          ownerEmail="owner@example.com"
        />
        <div className="quick-view-content">
          <main id="main">
            <a href="#projects">Explore work</a>
          </main>
        </div>
      </>
    </ThemeProvider>
  );
  return welcome;
}
