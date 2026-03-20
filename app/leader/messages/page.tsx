import { Suspense } from 'react';
import LeaderMessagesClient from './LeaderMessagesClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function LeaderMessagesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading messages..." />}>
      <LeaderMessagesClient />
    </Suspense>
  );
}
