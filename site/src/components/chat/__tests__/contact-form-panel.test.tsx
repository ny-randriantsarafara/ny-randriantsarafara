import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ContactFormPanel } from '@/components/chat/contact-form-panel.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

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
  it('starts with the default topic when the conversation suggests none', () => {
    renderPanel(undefined);
    expect(screen.getByLabelText('Sujet')).toHaveValue('Prise de contact');
  });

  it('keeps the topic taken from the conversation', () => {
    renderPanel('Plateforme API Eurosport');
    expect(screen.getByLabelText('Sujet')).toHaveValue('Plateforme API Eurosport');
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
