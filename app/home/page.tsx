import { Suspense } from 'react';
import HomeClient from './HomeClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <HomeClient />
    </Suspense>
  );
}
