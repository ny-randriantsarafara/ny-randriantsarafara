import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactFormPanel } from '@/components/chat/contact-form-panel.tsx';
import { sendContactMessage } from '@/lib/contact/send-contact-message.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

vi.mock('@/lib/contact/send-contact-message.ts', () => ({
  sendContactMessage: vi.fn(),
}));

function renderPanel(topic: string | undefined) {
  render(
    <ContactFormPanel
      dictionary={dictionaryFor('fr')}
      locale="fr"
      topic={topic}
      openedAt={0}
      ownerEmail="owner@example.com"
      onClose={() => undefined}
    />
  );
}

describe('ContactFormPanel', () => {
  beforeEach(() => {
    vi.mocked(sendContactMessage).mockReset();
  });

  it('starts with the default topic when the conversation suggests none', () => {
    renderPanel(undefined);
    expect(screen.getByLabelText('Sujet')).toHaveValue('Prise de contact');
  });

  it('keeps the topic taken from the conversation', () => {
    renderPanel('Plateforme API Eurosport');
    expect(screen.getByLabelText('Sujet')).toHaveValue('Plateforme API Eurosport');
  });

  it('calls onAccepted after a successful send', async () => {
    const onAccepted = vi.fn();
    vi.mocked(sendContactMessage).mockResolvedValue({ kind: 'sent' });
    render(
      <ContactFormPanel
        dictionary={dictionaryFor('en')}
        locale="en"
        topic="Backend role"
        openedAt={Date.now() - 5000}
        ownerEmail="owner@example.com"
        onClose={() => undefined}
        onAccepted={onAccepted}
      />
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Name', { exact: true }), 'Alex');
    await user.type(screen.getByLabelText('Email address', { exact: true }), 'alex@example.com');
    await user.type(screen.getByLabelText('Your message', { exact: true }), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send the message' }));
    expect(onAccepted).toHaveBeenCalledOnce();
  });

  it.each(['rate_limited', 'invalid', 'failed'] as const)(
    'does not call onAccepted when send returns %s',
    async (kind) => {
      const onAccepted = vi.fn();
      vi.mocked(sendContactMessage).mockResolvedValue({ kind });
      render(
        <ContactFormPanel
          dictionary={dictionaryFor('en')}
          locale="en"
          topic="Backend role"
          openedAt={Date.now() - 5000}
          ownerEmail="owner@example.com"
          onClose={() => undefined}
          onAccepted={onAccepted}
        />
      );
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Name', { exact: true }), 'Alex');
      await user.type(screen.getByLabelText('Email address', { exact: true }), 'alex@example.com');
      await user.type(screen.getByLabelText('Your message', { exact: true }), 'Hello');
      await user.click(screen.getByRole('button', { name: 'Send the message' }));
      expect(onAccepted).not.toHaveBeenCalled();
      cleanup();
    }
  );

  it('does not call onAccepted when the honeypot is filled', async () => {
    const onAccepted = vi.fn();
    render(
      <ContactFormPanel
        dictionary={dictionaryFor('en')}
        locale="en"
        topic="Backend role"
        openedAt={Date.now() - 5000}
        ownerEmail="owner@example.com"
        onClose={() => undefined}
        onAccepted={onAccepted}
      />
    );
    const honeypot = document.querySelector('input[name="website"]');
    if (!(honeypot instanceof HTMLInputElement)) {
      throw new Error('Expected honeypot input');
    }
    honeypot.value = 'bot';
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Name', { exact: true }), 'Alex');
    await user.type(screen.getByLabelText('Email address', { exact: true }), 'alex@example.com');
    await user.type(screen.getByLabelText('Your message', { exact: true }), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send the message' }));
    expect(sendContactMessage).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('says what the information is used for and links the privacy policy', () => {
    renderPanel(undefined);
    expect(
      screen.getByText(/Les informations envoyées servent à vous répondre\. Consultez la/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute(
      'href',
      '/fr/confidentialite'
    );
  });
});
