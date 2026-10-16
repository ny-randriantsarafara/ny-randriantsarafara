import { blockSchema } from '@portfolio/content';
import { localeSchema, type Locale } from '@portfolio/content';
import { z } from 'zod';

// How long the site waits for a chat reply before answering locally.
export const CHAT_CLIENT_TIMEOUT_MILLISECONDS = 12_000;

const trimmedText = (min: number, max: number) => z.string().trim().min(min).max(max);

export const chatMessageSchema = z.object({
  role: z.enum(['visitor', 'assistant']),
  text: trimmedText(1, 500),
});

export const chatRequestSchema = z
  .object({
    locale: localeSchema,
    messages: z.array(chatMessageSchema).min(1).max(8),
    conversationId: z.uuid(),
  })
  .refine(
    (request) => request.messages.at(-1)?.role === 'visitor',
    'The last message must be from the visitor'
  );

export const chatOutcomeSchema = z.enum([
  'answered',
  'unknown',
  'sensitive',
  'refused',
  'clarification_required',
  'temporarily_unavailable',
]);

export const chatReplySchema = z.object({
  text: z.string().trim().min(1),
  answerSlugs: z.array(z.string()),
  blocks: z.array(blockSchema),
  suggestions: z.array(z.string()).max(3),
  outcome: chatOutcomeSchema,
});

export const chatModeSchema = z.enum(['model', 'scripted']);

export const chatResponseSchema = z.object({
  mode: chatModeSchema,
  publicationId: z.uuid(),
  reply: chatReplySchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatReply = z.infer<typeof chatReplySchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatOutcome = z.infer<typeof chatOutcomeSchema>;
export type ChatMode = z.infer<typeof chatModeSchema>;
export type { Locale };
