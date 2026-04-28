import { Suspense } from 'react';
import AdminResourcesClient from './AdminResourcesClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function AdminResourcesPage() {
  return <Suspense fallback={<LoadingScreen message="Loading..." />}><AdminResourcesClient /></Suspense>;
}
