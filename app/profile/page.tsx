'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, Hash, Phone, Shield, MapPin, Globe,
  Moon, Sun, LogOut, ChevronRight, CheckCircle2,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, language, setLanguage, logout } = useUserStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/');
    toast.success('Logged out successfully');
  };

  const roleLabel = { user: 'Member', leader: 'Leader', admin: 'Administrator' };

  return (
    <AppShell>
      <PageHeader title="Profile" showHelp />

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-5"
        >
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A84C]/30 to-[#8A6F2E]/20 border border-[#C9A84C]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cinzel, serif' }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F0EDE8]">{user?.name}</h2>
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full mt-1',
                user?.role === 'leader'
                  ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30'
                  : user?.role === 'admin'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              )}>
                <Shield className="w-2.5 h-2.5" />
                {roleLabel[user?.role || 'user']}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={user?.name || '—'} />
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Telegram ID" value={`@${user?.telegram_id || '—'}`} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={user?.phone || 'Not provided'} muted={!user?.phone} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="City" value={user?.city || '—'} />
          </div>
        </motion.div>

        {/* Groups Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-5"
        >
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-3">Groups</p>
          {user?.groups && user.groups.length > 0 ? (
            <div className="space-y-2.5">
              {user.groups.map((group) => (
                <div key={group.id} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-[#F0EDE8] text-sm">{group.name}</span>
                  <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#5A5A72] text-sm">No groups assigned</p>
          )}
        </motion.div>

        {/* Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden"
        >
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider px-5 pt-4 pb-3">Settings</p>

          {/* Theme */}
          <div className="px-5 py-3 border-t border-[#2A2A3E] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark'
                ? <Moon className="w-4 h-4 text-[#9A9AB0]" />
                : <Sun className="w-4 h-4 text-[#9A9AB0]" />
              }
              <span className="text-[#F0EDE8] text-sm">Theme</span>
            </div>
            <div className="flex items-center gap-1 bg-[#12121A] rounded-xl p-1 border border-[#2A2A3E]">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    theme === t
                      ? 'bg-[#C9A84C] text-[#0A0A0F]'
                      : 'text-[#5A5A72] hover:text-[#9A9AB0]'
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="px-5 py-3 border-t border-[#2A2A3E] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#9A9AB0]" />
              <span className="text-[#F0EDE8] text-sm">Language</span>
            </div>
            <div className="flex items-center gap-1 bg-[#12121A] rounded-xl p-1 border border-[#2A2A3E]">
              {(['en', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    language === lang
                      ? 'bg-[#C9A84C] text-[#0A0A0F]'
                      : 'text-[#5A5A72] hover:text-[#9A9AB0]'
                  )}
                >
                  {lang === 'en' ? 'English' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full bg-red-500/8 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 hover:bg-red-500/15 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Log Out</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          ) : (
            <div className="bg-red-500/8 border border-red-500/30 rounded-2xl p-4">
              <p className="text-[#F0EDE8] text-sm font-medium mb-1">Are you sure?</p>
              <p className="text-[#9A9AB0] text-xs mb-4">You'll need to authenticate again to log back in.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] text-[#9A9AB0] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
                >
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

function InfoRow({ icon, label, value, muted }: {
  icon: React.ReactNode; label: string; value: string; muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-[#12121A] border border-[#2A2A3E] flex items-center justify-center text-[#5A5A72] flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#5A5A72] uppercase tracking-wider">{label}</p>
        <p className={cn('text-sm truncate', muted ? 'text-[#5A5A72] italic' : 'text-[#F0EDE8]')}>{value}</p>
      </div>
    </div>
  );
}
