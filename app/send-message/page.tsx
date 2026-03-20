import { Suspense } from 'react';
import SendMessageClient from './SendMessageClient';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function SendMessagePage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <SendMessageClient />
    </Suspense>
  );
}
