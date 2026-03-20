import { Suspense } from 'react';
import AdminClient from './AdminClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading admin panel..." />}>
      <AdminClient />
    </Suspense>
  );
}
