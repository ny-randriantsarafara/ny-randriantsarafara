'use client';

import { SessionProvider, useSession } from 'next-auth/react';

import type { ReactNode } from 'react';

export function AdminProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { data: session, status } = useSession();
  return {
    isAdmin: status === 'authenticated' && !!session?.user,
    isLoading: status === 'loading',
  };
}
