'use client';

import { createContext, useContext, useMemo, useRef } from 'react';

// What the overview asks of the conversation: come back to it, write a question, or ask one.
export type ConversationRequest =
  | { kind: 'return' }
  | { kind: 'compose' }
  | { kind: 'ask'; question: string };

type ConversationHandler = (request: ConversationRequest) => void;

export type ConversationBridge = {
  openConversation: ConversationHandler;
  registerHandler: (handler: ConversationHandler) => () => void;
};

const unconnectedBridge: ConversationBridge = {
  openConversation: () => {},
  registerHandler: () => () => {},
};

const ConversationBridgeContext = createContext<ConversationBridge>(unconnectedBridge);

interface ConversationBridgeProviderProps {
  children: React.ReactNode;
}

// The overview and the conversation are siblings: the conversation registers how it opens.
export function ConversationBridgeProvider({ children }: ConversationBridgeProviderProps) {
  const handlerRef = useRef<ConversationHandler | null>(null);
  const bridge = useMemo<ConversationBridge>(
    () => ({
      openConversation: (request) => {
        handlerRef.current?.(request);
      },
      registerHandler: (handler) => {
        handlerRef.current = handler;
        return () => {
          if (handlerRef.current === handler) {
            handlerRef.current = null;
          }
        };
      },
    }),
    []
  );
  return <ConversationBridgeContext value={bridge}>{children}</ConversationBridgeContext>;
}

export function useConversationBridge(): ConversationBridge {
  return useContext(ConversationBridgeContext);
}
