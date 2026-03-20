'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface RoleGuardProps {
  children: React.ReactNode;
  allow: 'user' | 'leader' | 'any';
}

export default function RoleGuard({ children, allow }: RoleGuardProps) {
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    const isLeader = user.role === 'leader' || user.role === 'admin';

    if (allow === 'leader' && !isLeader) {
      router.replace('/home');
    } else if (allow === 'user' && isLeader) {
      router.replace('/leader');
    }
  }, [user, allow]);

  if (!user) return <LoadingScreen />;

  const isLeader = user.role === 'leader' || user.role === 'admin';
  if (allow === 'leader' && !isLeader) return <LoadingScreen />;
  if (allow === 'user' && isLeader) return <LoadingScreen />;

  return <>{children}</>;
}
