import { Suspense } from 'react';
import AdminGroupsClient from './AdminGroupsClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function AdminGroupsPage() {
  return <Suspense fallback={<LoadingScreen message="Loading groups..." />}><AdminGroupsClient /></Suspense>;
}
