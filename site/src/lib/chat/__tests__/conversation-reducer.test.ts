import { describe, expect, it } from 'vitest';

import {
  conversationReducer,
  initialConversationState,
  selectedAssistantTurn,
} from '@/lib/chat/conversation-reducer.ts';

describe('conversationReducer', () => {
  it('moves from idle to sending when a visitor message is sent', () => {
    const next = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'Hello',
    });
    expect(next.status).toBe('sending');
    expect(next.turns).toHaveLength(1);
  });

  it('stores assistant blocks and selects the latest answer', () => {
    const sending = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'Hello',
    });
    const answered = conversationReducer(sending, {
      type: 'receive',
      assistantId: 'a1',
      text: 'Reply',
      answerSlugs: ['journey'],
      blocks: [{ type: 'cv' }],
      suggestions: ['Next'],
      mode: 'scripted',
      outcome: 'answered',
      fallback: null,
    });
    expect(answered.status).toBe('answered');
    expect(selectedAssistantTurn(answered)?.blocks).toEqual([{ type: 'cv' }]);
  });

  it('allows selecting an earlier assistant message for the stage', () => {
    const base = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'One',
    });
    const firstAnswer = conversationReducer(base, {
      type: 'receive',
      assistantId: 'a1',
      text: 'First',
      answerSlugs: [],
      blocks: [{ type: 'timeline' }],
      suggestions: [],
      mode: 'scripted',
      outcome: 'answered',
      fallback: null,
    });
    const secondQuestion = conversationReducer(firstAnswer, {
      type: 'send',
      visitorId: 'v2',
      text: 'Two',
    });
    const secondAnswer = conversationReducer(secondQuestion, {
      type: 'receive',
      assistantId: 'a2',
      text: 'Second',
      answerSlugs: [],
      blocks: [{ type: 'cv' }],
      suggestions: [],
      mode: 'scripted',
      outcome: 'answered',
      fallback: null,
    });
    const reselected = conversationReducer(secondAnswer, {
      type: 'select-assistant',
      assistantId: 'a1',
    });
    expect(selectedAssistantTurn(reselected)?.text).toBe('First');
  });

  it('marks failed responses', () => {
    const sending = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'Hello',
    });
    const failed = conversationReducer(sending, {
      type: 'fail',
      assistantId: 'a1',
      errorText: 'Error',
    });
    expect(failed.status).toBe('failed');
    expect(selectedAssistantTurn(failed)).toMatchObject({
      outcome: 'temporarily_unavailable',
      fallback: null,
    });
  });

  it('keeps why a reply was answered locally', () => {
    const sending = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'Hello',
    });
    const answered = conversationReducer(sending, {
      type: 'receive',
      assistantId: 'a1',
      text: 'Reply',
      answerSlugs: [],
      blocks: [],
      suggestions: [],
      mode: 'scripted',
      outcome: 'temporarily_unavailable',
      fallback: 'timeout',
    });
    expect(selectedAssistantTurn(answered)).toMatchObject({
      outcome: 'temporarily_unavailable',
      fallback: 'timeout',
    });
  });

  it('replaces the pending visitor turn when a new send overlaps', () => {
    const sending = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'Hello',
    });
    const superseded = conversationReducer(sending, {
      type: 'send',
      visitorId: 'v2',
      text: 'Another',
    });
    expect(superseded.status).toBe('sending');
    expect(superseded.turns).toHaveLength(1);
    expect(superseded.turns[0]).toMatchObject({
      role: 'visitor',
      message: { id: 'v2', text: 'Another' },
    });
  });

  it('resets the conversation to the initial state', () => {
    const busy = conversationReducer(initialConversationState(), {
      type: 'send',
      visitorId: 'v1',
      text: 'Hello',
    });
    const reset = conversationReducer(busy, { type: 'reset' });
    expect(reset).toEqual(initialConversationState());
  });

  it('toggles quick view visibility', () => {
    const opened = conversationReducer(initialConversationState(), { type: 'open-quick-view' });
    expect(opened.quickViewOpen).toBe(true);
    const closed = conversationReducer(opened, { type: 'close-quick-view' });
    expect(closed.quickViewOpen).toBe(false);
    const toggled = conversationReducer(closed, { type: 'toggle-quick-view' });
    expect(toggled.quickViewOpen).toBe(true);
  });
});
