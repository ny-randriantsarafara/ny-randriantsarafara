'use client';

import type { ReactNode } from 'react';

type PortfolioPageShellProps = {
  chat: ReactNode;
  quickView: ReactNode;
};

export function PortfolioPageShell({ chat, quickView }: PortfolioPageShellProps) {
  return (
    <>
      {chat}
      {quickView}
    </>
  );
}
