'use client';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, MessageSquare, BookOpen, User, LayoutDashboard } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUserStore();

  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  const navItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/dashboard', label: 'Messages', icon: MessageSquare },
    ...(isLeader ? [{ href: '/leader', label: 'Leader', icon: LayoutDashboard }] : []),
    { href: '/vachan', label: 'Vachan', icon: BookOpen },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
      <div className="mx-3 mb-3">
        <div className="bg-[#12121A]/95 backdrop-blur-xl border border-[#2A2A3E] rounded-2xl px-2 py-2 flex items-center justify-around shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl transition-colors relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-[#C9A84C]/10 rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    isActive ? 'text-[#C9A84C]' : 'text-[#5A5A72]'
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className={cn(
                  'text-[10px] font-medium transition-colors duration-200',
                  isActive ? 'text-[#C9A84C]' : 'text-[#5A5A72]'
                )}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
