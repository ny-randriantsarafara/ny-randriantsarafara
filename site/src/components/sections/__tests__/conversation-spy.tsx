import { useEffect } from 'react';

import { useConversationBridge } from '@/components/providers';

import type { ConversationRequest } from '@/components/providers';

// Stands in for the conversation: receives what the overview asks of it.
export function ConversationSpy({
  onRequest,
}: {
  onRequest: (request: ConversationRequest) => void;
}) {
  const { registerHandler } = useConversationBridge();
  useEffect(() => registerHandler(onRequest), [registerHandler, onRequest]);
  return null;
}
