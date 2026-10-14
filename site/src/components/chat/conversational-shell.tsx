'use client';

import { MotionConfig } from 'motion/react';
import { useCallback, useReducer, useRef, useState } from 'react';

import { BlockRenderer } from '@/components/chat/block-renderer.tsx';
import { ChatHeaderControls } from '@/components/chat/chat-header-controls.tsx';
import { ChatInput } from '@/components/chat/chat-input.tsx';
import { ConversationLog } from '@/components/chat/conversation-log.tsx';
import { WelcomePanel } from '@/components/chat/welcome-panel.tsx';
import { Footer, Navbar } from '@/components/layout';
import { QuickViewSections } from '@/components/page/quick-view-sections.tsx';
import { createConversationId } from '@/lib/chat/conversation-id.ts';
import {
  conversationReducer,
  historyFromTurns,
  initialConversationState,
  selectedAssistantTurn,
} from '@/lib/chat/conversation-reducer.ts';
import { sendChatMessage } from '@/lib/chat/send-chat-message.ts';
import {
  loadPublicationClient,
  schedulePublicationPrefetch,
} from '@/lib/publication/load-publication-client.ts';

import type { WelcomeData } from '@/lib/chat/welcome-data.ts';
import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { PageSections } from '@/types/page-sections.ts';
import type { ActivePublication, Locale, PublicationContent } from '@portfolio/content';

type ConversationalShellProps = {
  locale: Locale;
  dictionary: Dictionary;
  welcome: WelcomeData;
  footer: PageSections['footer'];
  quickViewSections: PageSections;
  onOpenContact?: (topic: string | undefined) => void;
};

export function ConversationalShell({
  locale,
  dictionary,
  welcome,
  footer,
  quickViewSections,
  onOpenContact,
}: ConversationalShellProps) {
  const [state, dispatch] = useReducer(conversationReducer, undefined, initialConversationState);
  const [publicationContent, setPublicationContent] = useState<PublicationContent | null>(null);
  const publicationRef = useRef<ActivePublication | null>(null);
  const conversationIdRef = useRef(createConversationId());
  const prefetchStartedRef = useRef(false);

  const ensurePublication = useCallback(async (): Promise<ActivePublication> => {
    if (publicationRef.current !== null) {
      return publicationRef.current;
    }
    const loaded = await loadPublicationClient();
    publicationRef.current = loaded;
    setPublicationContent(loaded.content);
    return loaded;
  }, []);

  const handleFirstInteraction = useCallback((): void => {
    if (prefetchStartedRef.current) {
      return;
    }
    prefetchStartedRef.current = true;
    schedulePublicationPrefetch();
    void ensurePublication();
  }, [ensurePublication]);

  const submitQuestion = useCallback(
    async (text: string): Promise<void> => {
      handleFirstInteraction();
      const visitorId = crypto.randomUUID();
      dispatch({ type: 'send', visitorId, text });
      try {
        const publication = await ensurePublication();
        const history = historyFromTurns([
          ...state.turns,
          { role: 'visitor', message: { id: visitorId, text } },
        ]);
        const result = await sendChatMessage({
          locale,
          conversationId: conversationIdRef.current,
          messages: history,
          publication,
        });
        dispatch({
          type: 'receive',
          assistantId: crypto.randomUUID(),
          text: result.response.reply.text,
          blocks: result.response.reply.blocks,
          suggestions: result.response.reply.suggestions,
          mode: result.response.mode,
          usedFallback: result.kind === 'fallback',
        });
      } catch {
        dispatch({
          type: 'fail',
          assistantId: crypto.randomUUID(),
          errorText: dictionary.chat.errorGeneric,
        });
      }
    },
    [dictionary.chat.errorGeneric, ensurePublication, handleFirstInteraction, locale, state.turns]
  );

  const selectedTurn = selectedAssistantTurn(state);
  const showWelcome = state.turns.length === 0;
  const quickViewClass = state.quickViewOpen ? 'quick-view-visible' : '';

  return (
    <MotionConfig reducedMotion="user">
      <div className={`conversational-ui ${quickViewClass}`}>
        <div className="chat-surface flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--glass-border)] px-4 py-4 backdrop-blur-xl md:px-8">
            <ChatHeaderControls
              locale={locale}
              dictionary={dictionary}
              quickViewOpen={state.quickViewOpen}
              onToggleQuickView={() => dispatch({ type: 'toggle-quick-view' })}
            />
          </header>

          <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8">
            <section
              aria-label={dictionary.chat.conversationLabel}
              className="flex min-h-0 flex-1 flex-col gap-6 lg:max-w-md lg:flex-none lg:w-[420px]"
            >
              {showWelcome && (
                <WelcomePanel
                  welcome={welcome}
                  dictionary={dictionary}
                  onStarterClick={(question) => {
                    void submitQuestion(question);
                  }}
                  onFirstInteraction={handleFirstInteraction}
                />
              )}

              <ConversationLog
                state={state}
                dictionary={dictionary}
                locale={locale}
                content={publicationContent}
                onSuggestion={(suggestion) => {
                  void submitQuestion(suggestion);
                }}
                onSelectAssistant={(assistantId) =>
                  dispatch({ type: 'select-assistant', assistantId })
                }
                onOpenContact={onOpenContact}
              />

              <div className="mt-auto pt-4">
                <ChatInput
                  dictionary={dictionary}
                  disabled={state.status === 'sending'}
                  onSend={(message) => {
                    void submitQuestion(message);
                  }}
                  onFirstInteraction={handleFirstInteraction}
                />
              </div>
            </section>

            <section
              aria-label={dictionary.chat.stageLabel}
              className="chat-stage hidden min-h-[320px] flex-1 lg:block"
            >
              {publicationContent !== null &&
                selectedTurn !== null &&
                selectedTurn.blocks.length > 0 && (
                  <BlockRenderer
                    blocks={selectedTurn.blocks}
                    content={publicationContent}
                    locale={locale}
                    dictionary={dictionary}
                    layout="stage"
                    onOpenContact={onOpenContact}
                  />
                )}
            </section>
          </div>
        </div>
      </div>

      <div className={`quick-view-content ${quickViewClass}`}>
        <main id="main" className="relative z-10 flex w-full flex-col items-center pb-24 md:pb-32">
          <QuickViewSections sections={quickViewSections} />
        </main>
        <Footer data={footer} />
        <Navbar locale={locale} dictionary={dictionary} />
      </div>
    </MotionConfig>
  );
}
