'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, MessageSquare, Siren, CheckCheck,
  TrendingUp, Map, Shield, ChevronRight,
  BarChart2, Settings, UserPlus, Layers,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalMessages: number;
  totalEmergency: number;
  totalReplies: number;
  todayMessages: number;
  todayUsers: number;
  weekMessages: number;
  replyRate: number;
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { t } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    if (user.role !== 'admin') { router.replace('/home'); return; }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/analytics?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.stats);
      setGroupCounts(data.groupCounts || {});
      setTopCities(data.topCities || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  usePolling(fetchAnalytics, [user?.telegram_id], { interval: 30000, enabled: !!user });

  const navCards = [
    { icon: Users, label: 'Manage Users', sub: `${stats?.totalUsers ?? '—'} total members`, href: '/admin/users', color: 'blue' },
    { icon: Shield, label: 'Manage Leaders', sub: 'Assign & manage leaders', href: '/admin/leaders', color: 'gold' },
    { icon: Layers, label: 'Group Mappings', sub: 'Telegram → Internal groups', href: '/admin/groups', color: 'purple' },
    { icon: BarChart2, label: 'Analytics', sub: 'Detailed stats & reports', href: '/admin/analytics', color: 'green' },
  ];

  return (
    <AppShell showNav={false}>
      <PageHeader title="Admin Panel" subtitle={`Logged in as ${user?.name}`} showBack helpKey="leader_dashboard" />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-2.5">
          <StatCard label="Total Users" value={stats?.totalUsers ?? '—'} icon={<Users className="w-4 h-4" />} color="blue" loading={loading} />
          <StatCard label="Total Messages" value={stats?.totalMessages ?? '—'} icon={<MessageSquare className="w-4 h-4" />} color="gold" loading={loading} />
          <StatCard label="Emergency" value={stats?.totalEmergency ?? '—'} icon={<Siren className="w-4 h-4" />} color="red" loading={loading} />
          <StatCard label="Reply Rate" value={stats ? `${stats.replyRate}%` : '—'} icon={<CheckCheck className="w-4 h-4" />} color="green" loading={loading} />
        </motion.div>

        {/* Today Row */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Today</p>
          <div className="grid grid-cols-3 gap-3">
            <TodayItem label="New Users" value={stats?.todayUsers ?? 0} icon={<UserPlus className="w-3.5 h-3.5 text-blue-400" />} />
            <TodayItem label="Messages" value={stats?.todayMessages ?? 0} icon={<TrendingUp className="w-3.5 h-3.5 text-gold" />} />
            <TodayItem label="This Week" value={stats?.weekMessages ?? 0} icon={<BarChart2 className="w-3.5 h-3.5 text-purple-400" />} />
          </div>
        </motion.div>

        {/* Navigation Cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="space-y-2.5">
          {navCards.map((card, i) => (
            <motion.button
              key={card.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(card.href)}
              className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all text-left"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                card.color === 'blue' && 'bg-blue-500/10 text-blue-400',
                card.color === 'gold' && 'bg-[#C9A84C]/10 text-[#C9A84C]',
                card.color === 'purple' && 'bg-purple-500/10 text-purple-400',
                card.color === 'green' && 'bg-green-500/10 text-green-400',
              )}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{card.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </motion.button>
          ))}
        </motion.div>

        {/* Group breakdown */}
        {Object.keys(groupCounts).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Members by Group</p>
            <div className="space-y-3">
              {Object.entries(groupCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([group, count]) => {
                  const max = Math.max(...Object.values(groupCounts));
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={group}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{group}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* Top cities */}
        {topCities.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              <Map className="w-3 h-3 inline mr-1" />Top Cities by Messages
            </p>
            <div className="space-y-2.5">
              {topCities.slice(0, 5).map((c, i) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-4" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{c.city}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; loading: boolean;
}) {
  const colors: Record<string, string> = {
    blue: 'rgba(59,130,246,0.08)', gold: 'rgba(201,168,76,0.08)',
    red: 'rgba(239,68,68,0.08)', green: 'rgba(34,197,94,0.08)',
  };
  const textColors: Record<string, string> = {
    blue: 'rgb(96,165,250)', gold: '#C9A84C', red: 'rgb(248,113,113)', green: 'rgb(74,222,128)',
  };
  return (
    <div className="rounded-2xl p-4" style={{ background: colors[color], border: `1px solid ${colors[color].replace('0.08', '0.2')}` }}>
      <div className="mb-2" style={{ color: textColors[color] }}>{icon}</div>
      {loading
        ? <div className="h-7 w-16 rounded animate-pulse mb-1" style={{ background: 'var(--bg-elevated)' }} />
        : <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
      }
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function TodayItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
