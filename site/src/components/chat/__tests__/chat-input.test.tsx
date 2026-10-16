import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChatInput } from '@/components/chat/chat-input.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';

describe('ChatInput', () => {
  it('sends on Enter without Shift', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <ChatInput
        dictionary={dictionaryFor('en')}
        privacyHref="/privacy"
        disabled={false}
        onSend={onSend}
        onFirstInteraction={vi.fn()}
      />
    );
    const field = screen.getByLabelText(/what would you like to know?/i);
    await user.type(field, 'Hello{Enter}');
    expect(onSend).toHaveBeenCalledWith('Hello');
  });
});
