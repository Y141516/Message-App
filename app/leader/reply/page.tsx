import { Suspense } from 'react';
import ReplyClient from './ReplyClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function ReplyPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading message..." />}>
      <ReplyClient />
    </Suspense>
  );
}
