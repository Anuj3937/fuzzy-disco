'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { listRecentDoubtsForStudent } from '@/lib/db';
import { useAuth } from '@/components/auth/AuthProvider';

type Doubt = any;

const RecentQueriesCtx = createContext<{ items: Doubt[]; refresh: () => Promise<void> }>({
  items: [],
  refresh: async () => {},
});

export function RecentQueriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Doubt[]>([]);

  const refresh = async () => {
    if (!user) return;
    const data = await listRecentDoubtsForStudent(user.uid, 10);
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, [user?.uid]);

  return (
    <RecentQueriesCtx.Provider value={{ items, refresh }}>
      {children}
    </RecentQueriesCtx.Provider>
  );
}

export const useRecentQueries = () => useContext(RecentQueriesCtx);
