'use client';
import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);
  const [tgUser, setTgUser] = useState<any>(null);
  const [initData, setInitData] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const telegram = (window as any).Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      telegram.expand();
      setTg(telegram);
      setTgUser(telegram.initDataUnsafe?.user || null);
      setInitData(telegram.initData || '');
    } else {
      // Dev mode fallback - simulates a Telegram user for local testing
      if (process.env.NODE_ENV === 'development') {
        const mockInitData = 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22TestUser%22%2C%22username%22%3A%22testuser%22%7D&auth_date=1700000000&hash=mock_hash_for_dev';
        setInitData(mockInitData);
        setTgUser({ id: 123456789, first_name: 'TestUser', username: 'testuser' });
      }
    }
    setIsReady(true);
  }, []);

  const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type);
  };

  const hapticNotification = (type: 'success' | 'error' | 'warning') => {
    tg?.HapticFeedback?.notificationOccurred(type);
  };

  return { tg, tgUser, initData, isReady, haptic, hapticNotification };
}
