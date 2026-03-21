'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Hash, Phone, MapPin, Globe, Moon, Sun, LogOut, CheckCircle2, Shield, Languages } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const { theme, setTheme, lang, setLang, t, isLight } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => { logout(); router.replace('/'); toast.success('Logged out'); };

  const roleLabel: Record<string, string> = { user: 'Member', leader: 'Leader', admin: 'Administrator' };

  // Each info row gets a unique pastel icon — matching Figma
  const infoRows = [
    { label: t('profile.name'),        value: user?.name || '—',           icon: <User className="w-4 h-4" />,  iconBg: isLight ? '#EEF0FD' : 'var(--bg-elevated)', iconColor: '#5B6EF5' },
    { label: t('profile.telegram_id'), value: user?.telegram_id || '—',    icon: <Hash className="w-4 h-4" />,  iconBg: isLight ? '#F3EEFF' : 'var(--bg-elevated)', iconColor: '#9B5DE5' },
    { label: t('profile.phone'),       value: user?.phone || 'Not provided',icon: <Phone className="w-4 h-4" />, iconBg: isLight ? '#FFF0F3' : 'var(--bg-elevated)', iconColor: '#E84393', muted: !user?.phone },
    { label: t('profile.city'),        value: user?.city || '—',            icon: <MapPin className="w-4 h-4" />,iconBg: isLight ? '#E8F8FF' : 'var(--bg-elevated)', iconColor: '#2196F3' },
  ];

  return (
    <AppShell>
      <PageHeader title={t('profile.title')} helpKey="profile" />
      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white"
              style={{ background: 'var(--send-btn-bg)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: isLight ? '#3D3D8F' : 'var(--text-primary)' }}>{user?.name}</h2>
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-white font-semibold mt-1"
                style={{ background: user?.role === 'leader' ? 'var(--send-btn-bg)' : user?.role === 'admin' ? '#9B5DE5' : '#5B6EF5' }}>
                <Shield className="w-3 h-3" /> {roleLabel[user?.role || 'user']}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-4">
            {infoRows.map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: row.iconBg, color: row.iconColor }}>
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{row.label}</p>
                  <p className="text-sm font-semibold truncate"
                    style={{ color: (row as any).muted ? 'var(--text-muted)' : 'var(--text-primary)', fontStyle: (row as any).muted ? 'italic' : 'normal' }}>
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Groups */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl p-5"
          style={{ background: 'var(--group-card-bg)', border: '1px solid var(--group-card-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: isLight ? '#007A5E' : 'var(--text-muted)' }}>{t('profile.groups')}</p>
          {user?.groups?.length ? user.groups.map(g => (
            <div key={g.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#00C48C' }}>
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{g.name}</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: '#00C48C' }}>Verified</span>
            </div>
          )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No groups assigned</p>}
        </motion.div>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-bold uppercase tracking-widest px-5 pt-4 pb-3" style={{ color: 'var(--text-muted)' }}>{t('profile.settings')}</p>

          {/* Theme row */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: isLight ? '#F0EEF8' : 'var(--bg-elevated)', color: isLight ? '#7B5EA7' : 'var(--text-secondary)' }}>
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('profile.theme')}</span>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              {(['dark', 'light'] as const).map(th => (
                <button key={th} onClick={() => setTheme(th)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: theme === th ? 'var(--send-btn-bg)' : 'transparent',
                    color: theme === th ? 'white' : 'var(--text-muted)',
                  }}>
                  {th === 'dark' ? t('profile.dark') : t('profile.light')}
                </button>
              ))}
            </div>
          </div>

          {/* Language row */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: isLight ? '#E8F8FF' : 'var(--bg-elevated)', color: isLight ? '#2196F3' : 'var(--text-secondary)' }}>
              <Languages className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('profile.language')}</span>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              {(['en', 'hi'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: lang === l ? 'var(--send-btn-bg)' : 'transparent',
                    color: lang === l ? 'white' : 'var(--text-muted)',
                  }}>
                  {l === 'en' ? 'English' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {!showLogoutConfirm ? (
            <button onClick={() => setShowLogoutConfirm(true)}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 text-white font-bold text-sm"
              style={{ background: 'var(--logout-bg)', boxShadow: isLight ? '0 4px 20px rgba(241,91,181,0.3)' : 'none' }}>
              <LogOut className="w-4 h-4" /> {t('profile.logout')}
            </button>
          ) : (
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('profile.logout_confirm')}</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('profile.logout_sub')}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {t('profile.cancel')}
                </button>
                <button onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'var(--logout-bg)' }}>
                  {t('profile.logout')}
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </AppShell>
  );
}
