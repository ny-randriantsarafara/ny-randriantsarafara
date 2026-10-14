'use client';

import Link from 'next/link';
import { useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';

const MAX_CHARS = 500;
const COUNTER_THRESHOLD = 450;

type ChatInputProps = {
  dictionary: Dictionary;
  privacyHref: string;
  disabled: boolean;
  onSend: (text: string) => void;
  onFirstInteraction: () => void;
};

export function ChatInput({
  dictionary,
  privacyHref,
  disabled,
  onSend,
  onFirstInteraction,
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const trimmed = value.trim();
  const remaining = MAX_CHARS - value.length;
  const showCounter = value.length >= COUNTER_THRESHOLD;
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_CHARS && !disabled;

  const handleSend = (): void => {
    if (!canSend) {
      return;
    }
    onSend(trimmed);
    setValue('');
  };

  const handleFocus = (): void => {
    onFirstInteraction();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    handleSend();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="glass-panel flex items-end gap-2 rounded-2xl p-2">
        <label className="sr-only" htmlFor="chat-message">
          {dictionary.chat.inputPlaceholder}
        </label>
        <textarea
          id="chat-message"
          rows={2}
          maxLength={MAX_CHARS}
          value={value}
          disabled={disabled}
          placeholder={dictionary.chat.inputPlaceholder}
          onFocus={handleFocus}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-[3rem] flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
          style={{ color: 'var(--text-primary)' }}
        />
        <Button type="button" variant="primary" disabled={!canSend} onClick={handleSend}>
          {disabled ? dictionary.chat.sending : dictionary.chat.send}
        </Button>
      </div>
      {showCounter && (
        <p className="text-xs" style={{ color: 'var(--text-dimmed)' }} aria-live="polite">
          {remaining} {dictionary.chat.charLimit}
        </p>
      )}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dimmed)' }}>
        {dictionary.chat.privacyNotice}{' '}
        <Link href={privacyHref} prefetch={false} className="underline decoration-dotted">
          {dictionary.chat.privacyLinkSlot}
        </Link>
      </p>
    </div>
  );
}
