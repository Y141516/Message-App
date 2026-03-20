'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';
import { useUserStore } from '@/store/userStore';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function RootPage() {
  const router = useRouter();
  const { initData, isReady } = useTelegram();
  const { setUser, setTelegramInitData, user } = useUserStore();

  useEffect(() => {
    if (!isReady) return;

    const authenticate = async () => {
      // If user already in store and onboarding complete, route by role
      if (user?.onboarding_complete) {
        const role = user.role;
        if (role === 'admin') router.replace('/admin');
        else if (role === 'leader') router.replace('/leader');
        else router.replace('/home');
        return;
      }

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === 'not_a_member') {
            router.replace('/not-authorized');
          } else {
            router.replace('/error');
          }
          return;
        }

        setTelegramInitData(initData);

        if (data.isNewUser) {
          sessionStorage.setItem('onboarding_data', JSON.stringify({
            telegramUser: data.telegramUser,
            telegramId: data.telegramId,
            internalGroups: data.internalGroups,
          }));
          router.replace('/onboarding');
        } else {
          setUser(data.user);
          // Route by role
          const role = data.user.role;
          if (role === 'admin') router.replace('/admin');
          else if (role === 'leader') router.replace('/leader');
          else router.replace('/home');
        }
      } catch (err) {
        console.error('Auth failed:', err);
        router.replace('/error');
      }
    };

    authenticate();
  }, [isReady, initData]);

  return <LoadingScreen message="Jay Bhagwanji..." />;
}
