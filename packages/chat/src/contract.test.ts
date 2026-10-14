import { describe, expect, it } from 'vitest';

import { chatReplySchema, chatRequestSchema, chatResponseSchema } from './contract.ts';

const conversationId = '3f0c6d1e-8a59-4c1b-9d2e-6b7a1c0e5f42';

describe('chatRequestSchema', () => {
  it('accepts a visitor message ending the history', () => {
    const result = chatRequestSchema.safeParse({
      locale: 'en',
      conversationId,
      messages: [{ role: 'visitor', text: 'What is your stack?' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when the last message is from the assistant', () => {
    const result = chatRequestSchema.safeParse({
      locale: 'fr',
      conversationId,
      messages: [
        { role: 'visitor', text: 'Bonjour' },
        { role: 'assistant', text: 'Bonjour.' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty or overlong message text', () => {
    const empty = chatRequestSchema.safeParse({
      locale: 'en',
      conversationId,
      messages: [{ role: 'visitor', text: '   ' }],
    });
    const long = chatRequestSchema.safeParse({
      locale: 'en',
      conversationId,
      messages: [{ role: 'visitor', text: 'x'.repeat(501) }],
    });
    expect(empty.success).toBe(false);
    expect(long.success).toBe(false);
  });

  it('allows up to eight turns', () => {
    const messages = Array.from({ length: 8 }, (_, index) =>
      index % 2 === 1
        ? { role: 'visitor' as const, text: `Question ${index}` }
        : { role: 'assistant' as const, text: `Answer ${index}` }
    );
    const result = chatRequestSchema.safeParse({
      locale: 'en',
      conversationId,
      messages,
    });
    expect(result.success).toBe(true);
  });
});

describe('chatReplySchema', () => {
  it('accepts a grounded reply with blocks and suggestions', () => {
    const result = chatReplySchema.safeParse({
      text: 'I work with TypeScript and AWS.',
      answerSlugs: ['tech-stack'],
      blocks: [{ type: 'skills', capabilitySlug: 'backend' }],
      suggestions: ['Tell me about Eurosport', 'How do you test?'],
      outcome: 'answered',
    });
    expect(result.success).toBe(true);
  });

  it('rejects more than three suggestions', () => {
    const result = chatReplySchema.safeParse({
      text: 'Unknown.',
      answerSlugs: [],
      blocks: [],
      suggestions: ['a', 'b', 'c', 'd'],
      outcome: 'unknown',
    });
    expect(result.success).toBe(false);
  });
});

describe('chatResponseSchema', () => {
  it('wraps a scripted reply with publication id', () => {
    const result = chatResponseSchema.safeParse({
      mode: 'scripted',
      publicationId: conversationId,
      reply: {
        text: 'Let us talk directly.',
        answerSlugs: [],
        blocks: [{ type: 'contact' }],
        suggestions: ['My background'],
        outcome: 'sensitive',
      },
    });
    expect(result.success).toBe(true);
  });
});
