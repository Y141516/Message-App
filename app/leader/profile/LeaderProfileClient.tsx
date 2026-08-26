'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Hash, Phone, Moon, Sun,
  LogOut, Shield, Languages,
  Trash2, AlertTriangle,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function LeaderProfileClient() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const { theme, setTheme, lang, setLang, isLight } = useTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm]   = useState(false);
  const [clearMode, setClearMode] = useState<'messages_only' | 'full'>('messages_only');
  const [clearing, setClearing]   = useState(false);

  const handleLogout = () => { logout(); router.replace('/'); toast.success('Logged out'); };

  const handleClearData = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/users/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user!.telegram_id, mode: clearMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.accountDeleted) {
        // Account gone — next auth will treat this as a brand new user.
        toast.success('Account fully reset');
        logout();
        router.replace('/');
      } else {
        // Data cleared but the account is still valid (leader full reset, or
        // messages_only for anyone) — no need to force a logout.
        toast.success(data.note || 'Data cleared successfully');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear data');
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  const infoRows = [
    { label: 'NAME',        value: user?.name || '—',            icon: <User className="w-4 h-4" />,  iconBg: isLight ? '#EEF0FD' : 'var(--bg-elevated)', iconColor: '#5B6EF5' },
    { label: 'TELEGRAM ID', value: user?.telegram_id || '—',     icon: <Hash className="w-4 h-4" />,  iconBg: isLight ? '#F3EEFF' : 'var(--bg-elevated)', iconColor: '#9B5DE5' },
    { label: 'PHONE',       value: user?.phone || 'Not provided', icon: <Phone className="w-4 h-4" />, iconBg: isLight ? '#FFF0F3' : 'var(--bg-elevated)', iconColor: '#E84393', muted: !user?.phone },
  ];

  return (
    <AppShell>
      <PageHeader title="Profile" helpKey="profile" />
      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{ background: 'var(--send-btn-bg)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'L'}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: isLight ? '#3D3D8F' : 'var(--text-primary)' }}>
                {user?.name}
              </h2>
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full text-white font-semibold mt-1"
                style={{ background: 'var(--send-btn-bg)' }}>
                <Shield className="w-3 h-3" /> Leader
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {infoRows.map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: row.iconBg, color: row.iconColor }}>
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                    {row.label}
                  </p>
                  <p className="text-sm font-semibold truncate"
                    style={{
                      color: (row as any).muted ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontStyle: (row as any).muted ? 'italic' : 'normal',
                    }}>
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-xs font-bold uppercase tracking-widest px-5 pt-4 pb-3"
            style={{ color: 'var(--text-muted)' }}>SETTINGS</p>

          <div className="px-5 py-3 flex items-center gap-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: isLight ? '#F0EEF8' : 'var(--bg-elevated)', color: isLight ? '#7B5EA7' : 'var(--text-secondary)' }}>
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Theme</span>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              {(['dark', 'light'] as const).map(th => (
                <button key={th} onClick={() => setTheme(th)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: theme === th ? 'var(--send-btn-bg)' : 'transparent',
                    color: theme === th ? 'white' : 'var(--text-muted)',
                  }}>
                  {th === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 flex items-center gap-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: isLight ? '#E8F8FF' : 'var(--bg-elevated)', color: isLight ? '#2196F3' : 'var(--text-secondary)' }}>
              <Languages className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Language</span>
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

        {/* Clear Data */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <AnimatePresence>
            {!showClearConfirm ? (
              <button onClick={() => setShowClearConfirm(true)}
                className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98]"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold flex-1 text-left text-red-400">Clear My Data</span>
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-bold text-red-400">Clear My Data</p>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Choose what to delete. This cannot be undone.
                </p>
                <div className="space-y-2 mb-4">
                  {[
                    { id: 'messages_only', label: 'Clear messages & files only', sub: 'Keeps your name, phone and account' },
                    { id: 'full',          label: 'Full reset',                   sub: 'Resets your profile & deletes your replies. Account stays active (other members\u2019 messages still reference it).' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setClearMode(opt.id as any)}
                      className="w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all"
                      style={{
                        background: clearMode === opt.id ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
                        border: `1px solid ${clearMode === opt.id ? 'rgba(239,68,68,0.4)' : 'var(--border-subtle)'}`,
                      }}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${clearMode === opt.id ? 'border-red-400' : 'border-gray-400'}`}>
                        {clearMode === opt.id && <div className="w-2 h-2 rounded-full bg-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{opt.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    Cancel
                  </button>
                  <button onClick={handleClearData} disabled={clearing}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-red-500 disabled:opacity-50">
                    {clearing ? 'Clearing...' : 'Confirm Delete'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {!showLogoutConfirm ? (
            <button onClick={() => setShowLogoutConfirm(true)}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 text-white font-bold text-sm"
              style={{ background: 'var(--logout-bg)' }}>
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          ) : (
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Are you sure?</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>You will need to authenticate again.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'var(--logout-bg)' }}>
                  Log Out
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </AppShell>
  );
}
