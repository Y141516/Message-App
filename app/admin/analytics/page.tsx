import { Suspense } from 'react';
import AdminAnalyticsClient from './AdminAnalyticsClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function AdminAnalyticsPage() {
  return <Suspense fallback={<LoadingScreen message="Loading analytics..." />}><AdminAnalyticsClient /></Suspense>;
}
