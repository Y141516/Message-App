'use client';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, MessageSquare, BookOpen, User, LayoutDashboard, Settings } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUserStore();
  const { t } = useTheme();

  const role = user?.role;

  const navItems = role === 'admin'
    ? [
        { href: '/admin', label: 'Admin', icon: Settings, exact: true },
        { href: '/admin/users', label: t('nav.messages'), icon: User, exact: false },
        { href: '/admin/groups', label: 'Groups', icon: LayoutDashboard, exact: false },
        { href: '/profile', label: t('nav.profile'), icon: User, exact: false },
      ]
    : role === 'leader'
    ? [
        { href: '/leader', label: t('nav.dashboard'), icon: LayoutDashboard, exact: true },
        { href: '/leader/messages', label: t('nav.messages'), icon: MessageSquare, exact: false },
        { href: '/profile', label: t('nav.profile'), icon: User, exact: false },
      ]
    : [
        { href: '/home', label: t('nav.home'), icon: Home, exact: false },
        { href: '/dashboard', label: t('nav.messages'), icon: MessageSquare, exact: false },
        { href: '/vachan', label: t('nav.vachan'), icon: BookOpen, exact: false },
        { href: '/profile', label: t('nav.profile'), icon: User, exact: false },
      ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
      <div className="mx-3 mb-3">
        <div
          className="rounded-2xl px-2 py-2 flex items-center justify-around shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
          style={{
            background: 'color-mix(in srgb, var(--bg-secondary) 95%, transparent)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--accent-gold) 12%, transparent)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className="w-5 h-5 transition-colors duration-200"
                  style={{ color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)' }}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className="text-[10px] font-medium transition-colors duration-200"
                  style={{ color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)' }}
                >
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
