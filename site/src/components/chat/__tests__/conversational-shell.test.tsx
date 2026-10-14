import { activePublicationFixture, contentFixture } from '@portfolio/content/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConversationalShell } from '@/components/chat/conversational-shell.tsx';
import { ThemeProvider } from '@/components/providers';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { buildPageSections } from '@/lib/publication/sections.ts';

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
    const dictionary = dictionaryFor('en');
    const sections = buildPageSections(contentFixture, 'en', dictionary);
    const welcome = buildWelcomeData(contentFixture, 'en', null);
    render(
      <ThemeProvider>
        <ConversationalShell
          locale="en"
          dictionary={dictionary}
          welcome={welcome}
          footer={sections.footer}
          quickViewSections={sections}
          ownerEmail="owner@example.com"
        />
      </ThemeProvider>
    );
    const starter = welcome.starters[0]?.question;
    if (starter === undefined) {
      throw new Error('Expected a starter question in the fixture');
    }
    await user.click(screen.getByRole('button', { name: starter }));
    expect(await screen.findByRole('log')).toHaveTextContent('Scripted answer');
  });

  it('toggles quick view from the header control', async () => {
    const user = userEvent.setup();
    const dictionary = dictionaryFor('en');
    const sections = buildPageSections(contentFixture, 'en', dictionary);
    render(
      <ThemeProvider>
        <ConversationalShell
          locale="en"
          dictionary={dictionary}
          welcome={buildWelcomeData(contentFixture, 'en', null)}
          footer={sections.footer}
          quickViewSections={sections}
          ownerEmail="owner@example.com"
        />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: /quick view/i }));
    expect(screen.getByRole('link', { name: /explore work/i })).toBeInTheDocument();
  });
});
