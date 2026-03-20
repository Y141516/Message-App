import { Suspense } from 'react';
import AdminLeadersClient from './AdminLeadersClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function AdminLeadersPage() {
  return <Suspense fallback={<LoadingScreen message="Loading leaders..." />}><AdminLeadersClient /></Suspense>;
}
