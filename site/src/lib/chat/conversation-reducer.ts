import type { HistoryMessage } from '@/lib/chat/chat-history.ts';
import type { ChatMode } from '@portfolio/chat';
import type { Block } from '@portfolio/content';

export type ConversationStatus = 'idle' | 'sending' | 'answered' | 'failed';

export type AssistantTurn = {
  id: string;
  text: string;
  answerSlugs: string[];
  blocks: Block[];
  suggestions: string[];
  mode: ChatMode;
  usedFallback: boolean;
};

export type VisitorTurn = {
  id: string;
  text: string;
};

export type ConversationTurn =
  | { role: 'visitor'; message: VisitorTurn }
  | { role: 'assistant'; message: AssistantTurn };

export type ConversationState = {
  status: ConversationStatus;
  turns: ConversationTurn[];
  selectedAssistantId: string | null;
  quickViewOpen: boolean;
};

export type ConversationAction =
  | { type: 'send'; visitorId: string; text: string }
  | {
      type: 'receive';
      assistantId: string;
      text: string;
      answerSlugs: string[];
      blocks: Block[];
      suggestions: string[];
      mode: ChatMode;
      usedFallback: boolean;
    }
  | { type: 'fail'; assistantId: string; errorText: string }
  | { type: 'select-assistant'; assistantId: string }
  | { type: 'open-quick-view' }
  | { type: 'close-quick-view' }
  | { type: 'toggle-quick-view' }
  | { type: 'reset' };

function latestAssistantId(turns: readonly ConversationTurn[]): string | null {
  const reversed = [...turns].reverse();
  const found = reversed.find((turn) => turn.role === 'assistant');
  if (found === undefined || found.role !== 'assistant') {
    return null;
  }
  return found.message.id;
}

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  if (action.type === 'send') {
    if (state.status === 'sending') {
      return state;
    }
    return {
      ...state,
      status: 'sending',
      turns: [
        ...state.turns,
        { role: 'visitor', message: { id: action.visitorId, text: action.text } },
      ],
    };
  }

  if (action.type === 'receive') {
    const turns: ConversationTurn[] = [
      ...state.turns,
      {
        role: 'assistant',
        message: {
          id: action.assistantId,
          text: action.text,
          answerSlugs: action.answerSlugs,
          blocks: action.blocks,
          suggestions: action.suggestions,
          mode: action.mode,
          usedFallback: action.usedFallback,
        },
      },
    ];
    return {
      ...state,
      status: 'answered',
      turns,
      selectedAssistantId: action.assistantId,
    };
  }

  if (action.type === 'fail') {
    const turns: ConversationTurn[] = [
      ...state.turns,
      {
        role: 'assistant',
        message: {
          id: action.assistantId,
          text: action.errorText,
          answerSlugs: [],
          blocks: [],
          suggestions: [],
          mode: 'scripted',
          usedFallback: true,
        },
      },
    ];
    return {
      ...state,
      status: 'failed',
      turns,
      selectedAssistantId: action.assistantId,
    };
  }

  if (action.type === 'select-assistant') {
    return {
      ...state,
      selectedAssistantId: action.assistantId,
    };
  }

  if (action.type === 'open-quick-view') {
    return { ...state, quickViewOpen: true };
  }

  if (action.type === 'close-quick-view') {
    return { ...state, quickViewOpen: false };
  }

  if (action.type === 'toggle-quick-view') {
    return { ...state, quickViewOpen: !state.quickViewOpen };
  }

  if (action.type === 'reset') {
    return initialConversationState();
  }

  return state;
}

export function initialConversationState(): ConversationState {
  return {
    status: 'idle',
    turns: [],
    selectedAssistantId: null,
    quickViewOpen: false,
  };
}

export function selectedAssistantTurn(state: ConversationState): AssistantTurn | null {
  const targetId = state.selectedAssistantId ?? latestAssistantId(state.turns);
  if (targetId === null) {
    return null;
  }
  const found = state.turns.find(
    (turn) => turn.role === 'assistant' && turn.message.id === targetId
  );
  if (found === undefined || found.role !== 'assistant') {
    return null;
  }
  return found.message;
}

export function historyFromTurns(turns: readonly ConversationTurn[]): HistoryMessage[] {
  return turns.flatMap((turn): HistoryMessage[] => {
    if (turn.role === 'visitor') {
      return [{ role: 'visitor', text: turn.message.text }];
    }
    return [{ role: 'assistant', text: turn.message.text }];
  });
}
