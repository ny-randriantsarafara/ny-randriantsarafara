'use client';

import { useConversationBridge } from '@/components/providers';
import { Button } from '@/components/ui';
import { iconRegistry } from '@/lib/icons';

const MessageCircleIcon = iconRegistry['message-circle'];

type ReturnToConversationProps = {
  label: string;
};

export function ReturnToConversation({ label }: ReturnToConversationProps) {
  const { openConversation } = useConversationBridge();

  return (
    <div className="js-only fixed right-4 top-4 z-50 md:right-8 md:top-6">
      <Button variant="glass" onClick={() => openConversation({ kind: 'return' })}>
        <MessageCircleIcon size={18} aria-hidden="true" />
        {label}
      </Button>
    </div>
  );
}
