import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Queue, Leader } from '@/types';

interface UserStore {
  user: User | null;
  telegramInitData: string | null;
  openQueues: Queue[];
  leaders: Leader[];
  language: 'en' | 'hi';
  _hasHydrated: boolean;

  setUser: (user: User) => void;
  setTelegramInitData: (data: string) => void;
  setOpenQueues: (queues: Queue[]) => void;
  setLeaders: (leaders: Leader[]) => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  setHasHydrated: (state: boolean) => void;
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
      _hasHydrated: false,

      setUser: (user) => set({ user }),
      setTelegramInitData: (data) => set({ telegramInitData: data }),
      setOpenQueues: (queues) => set({ openQueues: queues }),
      setLeaders: (leaders) => set({ leaders }),
      setLanguage: (lang) => set({ language: lang }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      logout: () => set({ user: null, telegramInitData: null, openQueues: [], leaders: [] }),
    }),
    {
      name: 'messenger-app-user',
      storage: createJSONStorage(() => {
        // Safe localStorage wrapper — won't crash during SSR
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
