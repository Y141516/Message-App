'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Hash, Phone, Shield, MapPin, Globe, Moon, Sun, LogOut, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const { theme, setTheme, lang, setLang, t } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/');
    toast.success(t('profile.logout'));
  };

  const roleLabel: Record<string, string> = { user: 'Member', leader: 'Leader', admin: 'Administrator' };

  return (
    <AppShell>
      <PageHeader title={t('profile.title')} helpKey="profile" />

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <span className="text-2xl font-bold text-gold" style={{ fontFamily: 'Cinzel, serif' }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</h2>
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full mt-1',
                user?.role === 'leader' ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30' :
                user?.role === 'admin' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              )}>
                <Shield className="w-2.5 h-2.5" />
                {roleLabel[user?.role || 'user']}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow icon={<User className="w-4 h-4" />} label={t('profile.name')} value={user?.name || '—'} />
            <InfoRow icon={<Hash className="w-4 h-4" />} label={t('profile.telegram_id')} value={`${user?.telegram_id || '—'}`} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label={t('profile.phone')} value={user?.phone || 'Not provided'} muted={!user?.phone} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label={t('profile.city')} value={user?.city || '—'} />
          </div>
        </motion.div>

        {/* Groups */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{t('profile.groups')}</p>
          {user?.groups?.length ? (
            <div className="space-y-2.5">
              {user.groups.map(g => (
                <div key={g.id} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                  <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Verified</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No groups assigned</p>}
        </motion.div>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs uppercase tracking-wider px-5 pt-4 pb-3" style={{ color: 'var(--text-muted)' }}>{t('profile.settings')}</p>

          {/* Theme */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> : <Sun className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('profile.theme')}</span>
            </div>
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              {(['dark', 'light'] as const).map(th => (
                <button key={th} onClick={() => setTheme(th)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: theme === th ? 'var(--accent-gold)' : 'transparent',
                    color: theme === th ? '#0A0A0F' : 'var(--text-muted)',
                  }}>
                  {th === 'dark' ? t('profile.dark') : t('profile.light')}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('profile.language')}</span>
            </div>
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              {(['en', 'hi'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: lang === l ? 'var(--accent-gold)' : 'transparent',
                    color: lang === l ? '#0A0A0F' : 'var(--text-muted)',
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
              className="w-full rounded-2xl p-4 flex items-center gap-3 text-red-400 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.2)' }}>
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium flex-1 text-left">{t('profile.logout')}</span>
            </button>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.3)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('profile.logout_confirm')}</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{t('profile.logout_sub')}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  {t('profile.cancel')}
                </button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">
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

function InfoRow({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm truncate" style={{ color: muted ? 'var(--text-muted)' : 'var(--text-primary)', fontStyle: muted ? 'italic' : 'normal' }}>{value}</p>
      </div>
    </div>
  );
}
