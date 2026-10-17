import { activePublicationFixture, contentFixture } from '@portfolio/content/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConversationalShell } from '@/components/chat/conversational-shell.tsx';
import { ReturnToConversation } from '@/components/page/return-to-conversation.tsx';
import {
  ConversationBridgeProvider,
  ThemeProvider,
  useConversationBridge,
} from '@/components/providers';
import { sendChatMessage } from '@/lib/chat/send-chat-message.ts';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

import type { ConversationRequest } from '@/components/providers';
import type { WelcomeData } from '@/lib/chat/welcome-data.ts';

const englishChat = dictionaryFor('en').chat;

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
    const { welcome } = renderShell();
    const starter = welcome.starters[0]?.question;
    if (starter === undefined) {
      throw new Error('Expected a starter question in the fixture');
    }
    await user.click(screen.getByRole('button', { name: starter }));
    expect(await screen.findByRole('log')).toHaveTextContent('Scripted answer');
    expect(screen.getByRole('log')).toHaveTextContent(englishChat.scriptedNotice);
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
    expect(log).toHaveTextContent(englishChat.fallbackNotice);
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
    expect(log).not.toHaveTextContent(englishChat.fallbackNotice);
    expect(log).not.toHaveTextContent(englishChat.scriptedNotice);
    expect(log.querySelector('[data-outcome="temporarily_unavailable"]')).not.toBeNull();
    warn.mockRestore();
  });

  it('opens the overview from the header control', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    await user.click(screen.getByRole('button', { name: 'Classic view' }));
    expect(container.querySelector('.quick-view-content')).toHaveClass('quick-view-visible');
    expect(container.querySelector('.conversational-ui')).toHaveClass('quick-view-visible');
  });

  it('comes back to the conversation from the overview', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const { container } = renderShell();
    await user.click(screen.getByRole('button', { name: 'Classic view' }));
    await user.click(overview().getByRole('button', { name: 'Back to chat mode' }));
    expect(container.querySelector('.quick-view-content')).not.toHaveClass('quick-view-visible');
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    scrollTo.mockRestore();
  });

  it('focuses the question field when the overview asks to write a question', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Classic view' }));
    await user.click(overview().getByRole('button', { name: 'Ask me a question' }));
    expect(screen.getByRole('textbox')).toHaveFocus();
    scrollTo.mockRestore();
  });

  it('asks a follow-up question chosen in the overview', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Classic view' }));
    await user.click(overview().getByRole('button', { name: overviewQuestion }));
    const log = await screen.findByRole('log');
    expect(log).toHaveTextContent(overviewQuestion);
    expect(log).toHaveTextContent('Scripted answer');
    scrollTo.mockRestore();
  });
});

const overviewQuestion = 'How did you prepare the data migration?';

function overview() {
  return within(screen.getByRole('region', { name: 'Overview page' }));
}

function OverviewRequest({ label, request }: { label: string; request: ConversationRequest }) {
  const { openConversation } = useConversationBridge();
  return (
    <button type="button" onClick={() => openConversation(request)}>
      {label}
    </button>
  );
}

function shellTree(welcome: WelcomeData) {
  const dictionary = dictionaryFor('en');
  return (
    <ThemeProvider>
      <ConversationBridgeProvider>
        <ConversationalShell
          locale="en"
          dictionary={dictionary}
          welcome={welcome}
          ownerEmail="owner@example.com"
        />
        <section className="quick-view-content" aria-label="Overview page">
          <ReturnToConversation label={dictionary.chat.backToChat} />
          <main id="main">
            <OverviewRequest label={dictionary.hero.askCta} request={{ kind: 'compose' }} />
            <OverviewRequest
              label={overviewQuestion}
              request={{ kind: 'ask', question: overviewQuestion }}
            />
          </main>
        </section>
      </ConversationBridgeProvider>
    </ThemeProvider>
  );
}

function renderShell() {
  const welcome = buildWelcomeData(contentFixture, 'en', null);
  const { container } = render(shellTree(welcome));
  return { welcome, container };
}
