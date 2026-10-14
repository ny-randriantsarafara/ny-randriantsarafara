import { contentFixture } from '@portfolio/content/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WelcomePanel } from '@/components/chat/welcome-panel.tsx';
import { buildWelcomeData } from '@/lib/chat/welcome-data.ts';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

describe('WelcomePanel', () => {
  it('renders starters and disclosure', () => {
    const welcome = buildWelcomeData(contentFixture, 'en');
    render(
      <WelcomePanel
        welcome={welcome}
        dictionary={dictionaryFor('en')}
        onStarterClick={vi.fn()}
        onFirstInteraction={vi.fn()}
      />
    );
    expect(screen.getByText(welcome.disclosure)).toBeInTheDocument();
    expect(screen.getByText(welcome.starters[0]?.question ?? '')).toBeInTheDocument();
  });
});
