import { activePublicationFixture, contentFixture } from '@portfolio/content/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConversationalShell } from '@/components/chat/conversational-shell.tsx';
import {
  ConversationBridgeProvider,
  ThemeProvider,
  useConversationBridge,
} from '@/components/providers';
import { sendChatMessage } from '@/lib/chat/send-chat-message.ts';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import * as trackEvent from '@/lib/tracking/track-event.ts';

import type { WelcomeData } from '@/lib/chat/welcome-data.ts';

vi.mock('@/lib/chat/send-chat-message.ts', () => ({
  sendChatMessage: vi.fn(),
}));

vi.mock('@/lib/publication/load-publication-client.ts', () => ({
  loadPublicationClient: vi.fn(async () => activePublicationFixture),
  schedulePublicationPrefetch: vi.fn(),
}));

vi.mock('@/hooks/use-scroll-spy.ts', () => ({
  useScrollSpy: () => 'hero',
}));

const apiReply = {
  mode: 'scripted' as const,
  publicationId: activePublicationFixture.publicationId,
  reply: {
    text: 'Scripted answer',
    answerSlugs: ['journey'],
    blocks: [{ type: 'timeline' as const }],
    suggestions: [],
    outcome: 'answered' as const,
  },
};

function AskBridge({ question }: { question: string }) {
  const { openConversation } = useConversationBridge();
  return (
    <button type="button" onClick={() => openConversation({ kind: 'ask', question })}>
      Ask follow-up
    </button>
  );
}

function renderShell() {
  const welcome: WelcomeData = buildWelcomeData(contentFixture, 'en', null);
  render(
    <ThemeProvider>
      <ConversationBridgeProvider>
        <ConversationalShell
          locale="en"
          dictionary={dictionaryFor('en')}
          welcome={welcome}
          ownerEmail="owner@example.com"
        />
        <AskBridge question="Second question while pending" />
      </ConversationBridgeProvider>
    </ThemeProvider>
  );
  const starter = welcome.starters[0]?.question;
  if (starter === undefined) {
    throw new Error('Expected a starter question');
  }
  return starter;
}

describe('ConversationalShell chat analytics lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(sendChatMessage).mockReset();
  });

  it('emits chat_cancelled without chat_failed when a turn is superseded', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    vi.mocked(sendChatMessage)
      .mockImplementationOnce(async () => {
        await firstGate;
        return { kind: 'api', response: apiReply };
      })
      .mockResolvedValueOnce({ kind: 'api', response: apiReply });

    const chatCancelled = vi.spyOn(trackEvent, 'trackChatCancelled');
    const chatFailed = vi.spyOn(trackEvent, 'trackChatFailed');
    const chatSubmitted = vi.spyOn(trackEvent, 'trackChatSubmitted');

    const user = userEvent.setup();
    const starter = renderShell();
    await user.click(screen.getByRole('button', { name: starter }));
    await user.click(screen.getByRole('button', { name: 'Ask follow-up' }));
    releaseFirst?.();

    await screen.findByText('Scripted answer');
    expect(chatCancelled).toHaveBeenCalledWith(
      'en',
      expect.any(String),
      expect.any(String),
      'superseded'
    );
    expect(chatFailed).not.toHaveBeenCalled();
    expect(chatSubmitted).toHaveBeenCalledTimes(2);
  });

  it('emits chat_cancelled without chat_failed when the shell unmounts during an in-flight turn', async () => {
    let releasePending: (() => void) | undefined;
    const pendingGate = new Promise<void>((resolve) => {
      releasePending = resolve;
    });
    vi.mocked(sendChatMessage).mockImplementationOnce(async () => {
      await pendingGate;
      return { kind: 'api', response: apiReply };
    });

    const chatCancelled = vi.spyOn(trackEvent, 'trackChatCancelled');
    const chatFailed = vi.spyOn(trackEvent, 'trackChatFailed');

    const welcome: WelcomeData = buildWelcomeData(contentFixture, 'en', null);
    const starter = welcome.starters[0]?.question;
    if (starter === undefined) {
      throw new Error('Expected a starter question');
    }
    const { unmount } = render(
      <ThemeProvider>
        <ConversationBridgeProvider>
          <ConversationalShell
            locale="en"
            dictionary={dictionaryFor('en')}
            welcome={welcome}
            ownerEmail="owner@example.com"
          />
        </ConversationBridgeProvider>
      </ThemeProvider>
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: starter }));
    unmount();

    expect(chatCancelled).toHaveBeenCalledWith(
      'en',
      expect.any(String),
      expect.any(String),
      'navigation'
    );
    expect(chatFailed).not.toHaveBeenCalled();

    releasePending?.();
  });

  it('emits chat_failed and chat_local_fallback once without a second chat_submitted on transport failure', async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      kind: 'fallback',
      failure: 'network',
      response: apiReply,
    });

    const chatSubmitted = vi.spyOn(trackEvent, 'trackChatSubmitted');
    const chatFailed = vi.spyOn(trackEvent, 'trackChatFailed');
    const chatLocalFallback = vi.spyOn(trackEvent, 'trackChatLocalFallback');

    const user = userEvent.setup();
    const starter = renderShell();
    await user.click(screen.getByRole('button', { name: starter }));
    await screen.findByText('Scripted answer');

    expect(chatSubmitted).toHaveBeenCalledOnce();
    expect(chatFailed).toHaveBeenCalledOnce();
    expect(chatLocalFallback).toHaveBeenCalledOnce();
    expect(chatFailed).toHaveBeenCalledWith(
      'en',
      expect.any(String),
      expect.any(String),
      'network'
    );
  });
});
