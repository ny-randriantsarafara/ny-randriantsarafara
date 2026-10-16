'use client';

import { ConversationBridgeProvider } from '@/components/providers';

import type { ReactNode } from 'react';

type PortfolioPageShellProps = {
  chat: ReactNode;
  quickView: ReactNode;
};

export function PortfolioPageShell({ chat, quickView }: PortfolioPageShellProps) {
  return (
    <ConversationBridgeProvider>
      {chat}
      {quickView}
    </ConversationBridgeProvider>
  );
}
