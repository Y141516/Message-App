import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
      <DashboardClient />
    </Suspense>
  );
}
