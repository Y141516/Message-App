import { Suspense } from 'react';
import ResourcesClient from './ResourcesClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function ResourcesPage() {
  return <Suspense fallback={<LoadingScreen message="Loading resources..." />}><ResourcesClient /></Suspense>;
}
