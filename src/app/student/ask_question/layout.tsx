'use client';

import { RecentQueriesProvider } from '@/containers/RecentQueriesProvider';

export default function AskQuestionLayout({ children }: { children: React.ReactNode }) {
  return <RecentQueriesProvider>{children}</RecentQueriesProvider>;
}
