import { Suspense } from 'react';
import AdminUsersClient from './AdminUsersClient';
import LoadingScreen from '@/components/ui/LoadingScreen';
export default function AdminUsersPage() {
  return <Suspense fallback={<LoadingScreen message="Loading users..." />}><AdminUsersClient /></Suspense>;
}
