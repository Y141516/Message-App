import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Queue, Leader } from '@/types';

interface UserStore {
  user: User | null;
  telegramInitData: string | null;
  openQueues: Queue[];
  leaders: Leader[];
  language: 'en' | 'hi';
  
  setUser: (user: User) => void;
  setTelegramInitData: (data: string) => void;
  setOpenQueues: (queues: Queue[]) => void;
  setLeaders: (leaders: Leader[]) => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      telegramInitData: null,
      openQueues: [],
      leaders: [],
      language: 'en',

      setUser: (user) => set({ user }),
      setTelegramInitData: (data) => set({ telegramInitData: data }),
      setOpenQueues: (queues) => set({ openQueues: queues }),
      setLeaders: (leaders) => set({ leaders }),
      setLanguage: (lang) => set({ language: lang }),
      logout: () => set({ user: null, telegramInitData: null, openQueues: [], leaders: [] }),
    }),
    {
      name: 'messenger-app-user',
      partialize: (state) => ({
        user: state.user,
        language: state.language,
      }),
    }
  )
);
