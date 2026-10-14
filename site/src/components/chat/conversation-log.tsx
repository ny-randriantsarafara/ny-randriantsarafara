'use client';

import { useEffect, useRef } from 'react';

import { BlockRenderer } from '@/components/chat/block-renderer.tsx';
import { RevealedText } from '@/components/chat/revealed-text.tsx';

import type { ConversationState, ConversationTurn } from '@/lib/chat/conversation-reducer.ts';
import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Locale, PublicationContent } from '@portfolio/content';

type ConversationLogProps = {
  state: ConversationState;
  dictionary: Dictionary;
  locale: Locale;
  content: PublicationContent | null;
  onSuggestion: (text: string) => void;
  onSelectAssistant: (assistantId: string) => void;
  onOpenContact?: (topic: string | undefined) => void;
};

export function ConversationLog({
  state,
  dictionary,
  locale,
  content,
  onSuggestion,
  onSelectAssistant,
  onOpenContact,
}: ConversationLogProps) {
  const latestAssistantRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = latestAssistantRef.current;
    if (node === null) {
      return;
    }
    node.focus();
  }, [state.turns.length, state.status]);

  const latestAssistantTurn = findLatestAssistantTurn(state.turns);
  const latestAssistantMessageId =
    latestAssistantTurn !== undefined && latestAssistantTurn.role === 'assistant'
      ? latestAssistantTurn.message.id
      : null;

  return (
    <div aria-live="polite" aria-relevant="additions" className="flex flex-col gap-6" role="log">
      {state.turns.map((turn) => {
        if (turn.role === 'visitor') {
          return (
            <article key={turn.message.id} className="flex justify-end">
              <div
                className="max-w-[90%] rounded-2xl px-4 py-3 text-sm"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
              >
                <span className="sr-only">{dictionary.chat.visitorLabel}</span>
                {turn.message.text}
              </div>
            </article>
          );
        }

        const isLatest = turn.role === 'assistant' && turn.message.id === latestAssistantMessageId;

        const isSelected = state.selectedAssistantId === turn.message.id;

        return (
          <article key={turn.message.id} className="flex flex-col gap-3">
            <div
              ref={isLatest ? latestAssistantRef : undefined}
              tabIndex={-1}
              className={`max-w-full rounded-2xl border px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] ${
                isSelected ? 'border-indigo-400/60' : 'border-[var(--glass-border)]'
              }`}
              style={{ background: 'var(--glass-bg-card)' }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-dimmed)' }}
                >
                  {dictionary.chat.assistantLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectAssistant(turn.message.id)}
                  className="chat-stage-select hidden text-xs underline decoration-dotted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] lg:inline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {dictionary.chat.selectAnswer}
                </button>
              </div>
              <RevealedText text={turn.message.text} className="text-sm leading-relaxed" />
              {turn.message.usedFallback && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-dimmed)' }}>
                  {dictionary.chat.fallbackNotice}
                </p>
              )}
            </div>

            {content !== null && turn.message.blocks.length > 0 && (
              <div className="chat-inline-blocks lg:hidden">
                <BlockRenderer
                  blocks={turn.message.blocks}
                  content={content}
                  locale={locale}
                  dictionary={dictionary}
                  layout="inline"
                  onOpenContact={onOpenContact}
                />
              </div>
            )}

            {turn.message.suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-dimmed)' }}>
                  {dictionary.chat.suggestionsLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {turn.message.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onSuggestion(suggestion)}
                      className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)]"
                      style={{ color: 'var(--text-secondary)', background: 'var(--tag-bg)' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}

      {state.status === 'sending' && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }} aria-live="polite">
          {dictionary.chat.sending}
        </p>
      )}
    </div>
  );
}

function findLatestAssistantTurn(turns: readonly ConversationTurn[]): ConversationTurn | undefined {
  const reversed = [...turns].reverse();
  return reversed.find((turn) => turn.role === 'assistant');
}
