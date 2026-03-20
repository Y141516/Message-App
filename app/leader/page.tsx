import { Suspense } from 'react';
import LeaderDashboardClient from './LeaderDashboardClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function LeaderDashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading leader dashboard..." />}>
      <LeaderDashboardClient />
    </Suspense>
  );
}
