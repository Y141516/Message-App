import { Suspense } from 'react';
import AnnouncementsClient from './AnnouncementsClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function AnnouncementsPage() {
  return <Suspense fallback={<LoadingScreen message="Loading..." />}><AnnouncementsClient /></Suspense>;
}
