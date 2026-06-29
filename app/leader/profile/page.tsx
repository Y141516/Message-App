import { Suspense } from 'react';
import LeaderProfileClient from './LeaderProfileClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function LeaderProfilePage() {
  return <Suspense fallback={<LoadingScreen />}><LeaderProfileClient /></Suspense>;
}
