'use client';

import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion,
} from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import { BlockRenderer } from '@/components/chat/block-renderer.tsx';
import { ChatHeaderControls } from '@/components/chat/chat-header-controls.tsx';
import { ChatInput } from '@/components/chat/chat-input.tsx';
import { ContactFormPanel } from '@/components/chat/contact-form-panel.tsx';
import { ConversationLog } from '@/components/chat/conversation-log.tsx';
import { WelcomePanel } from '@/components/chat/welcome-panel.tsx';
import { createConversationId } from '@/lib/chat/conversation-id.ts';
import {
  conversationReducer,
  historyFromTurns,
  initialConversationState,
  selectedAssistantTurn,
} from '@/lib/chat/conversation-reducer.ts';
import { deriveConversationTopic } from '@/lib/chat/conversation-topic.ts';
import { sendChatMessage } from '@/lib/chat/send-chat-message.ts';
import { syncQuickViewClass } from '@/lib/chat/sync-quick-view-class.ts';
import {
  loadPublicationClient,
  schedulePublicationPrefetch,
} from '@/lib/publication/load-publication-client.ts';

import type { WelcomeData } from '@/lib/chat/welcome-data.ts';
import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { ActivePublication, Locale, PublicationContent } from '@portfolio/content';

type ContactFormState = {
  openedAt: number;
  topic: string | undefined;
};

type ConversationalShellProps = {
  locale: Locale;
  dictionary: Dictionary;
  welcome: WelcomeData;
  ownerEmail: string;
};

export function ConversationalShell({
  locale,
  dictionary,
  welcome,
  ownerEmail,
}: ConversationalShellProps) {
  const [state, dispatch] = useReducer(conversationReducer, undefined, initialConversationState);
  const [publicationContent, setPublicationContent] = useState<PublicationContent | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState | null>(null);
  const reducedMotion = useReducedMotion();
  const publicationRef = useRef<ActivePublication | null>(null);
  const conversationIdRef = useRef(createConversationId());
  const prefetchStartedRef = useRef(false);
  const stateRef = useRef(state);
  const requestSeqRef = useRef(0);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useLayoutEffect(() => {
    syncQuickViewClass(state.quickViewOpen);
  }, [state.quickViewOpen]);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
    };
  }, []);

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

  const openContactForm = useCallback(
    (topic: string | undefined): void => {
      if (stateRef.current.status === 'sending') {
        return;
      }
      handleFirstInteraction();
      const derived =
        topic ?? deriveConversationTopic(stateRef.current.turns, publicationContent, locale);
      setContactForm({ openedAt: Date.now(), topic: derived });
    },
    [handleFirstInteraction, locale, publicationContent]
  );

  const submitQuestion = useCallback(
    async (text: string): Promise<void> => {
      if (stateRef.current.status === 'sending') {
        return;
      }
      handleFirstInteraction();
      const visitorId = crypto.randomUUID();
      const visitorTurn = {
        role: 'visitor' as const,
        message: { id: visitorId, text },
      };
      const turnsForHistory = [...stateRef.current.turns, visitorTurn];
      dispatch({ type: 'send', visitorId, text });

      chatAbortRef.current?.abort();
      const controller = new AbortController();
      chatAbortRef.current = controller;
      const requestId = requestSeqRef.current + 1;
      requestSeqRef.current = requestId;

      try {
        const publication = await ensurePublication();
        if (requestId !== requestSeqRef.current || controller.signal.aborted) {
          return;
        }
        const history = historyFromTurns(turnsForHistory);
        const result = await sendChatMessage({
          locale,
          conversationId: conversationIdRef.current,
          messages: history,
          publication,
          signal: controller.signal,
        });
        if (requestId !== requestSeqRef.current || controller.signal.aborted) {
          return;
        }
        if (result.kind === 'aborted') {
          return;
        }
        dispatch({
          type: 'receive',
          assistantId: crypto.randomUUID(),
          text: result.response.reply.text,
          answerSlugs: result.response.reply.answerSlugs,
          blocks: result.response.reply.blocks,
          suggestions: result.response.reply.suggestions,
          mode: result.response.mode,
          usedFallback: result.kind === 'fallback',
        });
      } catch {
        if (requestId !== requestSeqRef.current || controller.signal.aborted) {
          return;
        }
        dispatch({
          type: 'fail',
          assistantId: crypto.randomUUID(),
          errorText: dictionary.chat.errorGeneric,
        });
      }
    },
    [dictionary.chat.errorGeneric, ensurePublication, handleFirstInteraction, locale]
  );

  const sending = state.status === 'sending';
  const selectedTurn = selectedAssistantTurn(state);
  const showWelcome = state.turns.length === 0;
  const stageKey = selectedTurn?.id ?? 'empty';

  const stageBlocks =
    contactForm === null &&
    publicationContent !== null &&
    selectedTurn !== null &&
    selectedTurn.blocks.length > 0 ? (
      <BlockRenderer
        key={stageKey}
        blocks={selectedTurn.blocks}
        content={publicationContent}
        locale={locale}
        dictionary={dictionary}
        layout="stage"
        stageKey={stageKey}
        onOpenContact={openContactForm}
      />
    ) : null;

  const stageFade = reducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.28 },
      };

  const desktopStage = (
    <AnimatePresence mode="wait">
      {contactForm !== null ? (
        <m.div key="contact-form" {...stageFade}>
          <ContactFormPanel
            dictionary={dictionary}
            locale={locale}
            topic={contactForm.topic}
            openedAt={contactForm.openedAt}
            ownerEmail={ownerEmail}
            onClose={() => setContactForm(null)}
          />
        </m.div>
      ) : stageBlocks !== null ? (
        <m.div key={stageKey} {...stageFade}>
          {stageBlocks}
        </m.div>
      ) : null}
    </AnimatePresence>
  );

  const mobileContact =
    contactForm !== null ? (
      <div className="chat-inline-blocks lg:hidden">
        <ContactFormPanel
          dictionary={dictionary}
          locale={locale}
          topic={contactForm.topic}
          openedAt={contactForm.openedAt}
          ownerEmail={ownerEmail}
          onClose={() => setContactForm(null)}
        />
      </div>
    ) : null;

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="conversational-ui">
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
                    sendDisabled={sending}
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
                  sendDisabled={sending}
                  onSuggestion={(suggestion) => {
                    void submitQuestion(suggestion);
                  }}
                  onSelectAssistant={(assistantId) =>
                    dispatch({ type: 'select-assistant', assistantId })
                  }
                  onOpenContact={openContactForm}
                />

                {mobileContact}

                <div className="mt-auto pt-4">
                  <ChatInput
                    dictionary={dictionary}
                    disabled={sending}
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
                {desktopStage}
              </section>
            </div>
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
