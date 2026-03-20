'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, MessageSquare, CheckCheck,
  Siren, Clock, TrendingUp, BarChart2,
  Map, Settings, ChevronRight, RefreshCw,
  UserPlus, Shield,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/utils';

interface Analytics {
  totalUsers: number; totalLeaders: number; totalMessages: number;
  totalReplies: number; todayMessages: number; todayNewUsers: number;
  totalEmergency: number; pendingMessages: number; replyRate: number;
}

export default function AdminClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { t } = useTheme();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [groupData, setGroupData] = useState<{ name: string; count: number }[]>([]);
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
      setAnalytics(data.overview);
      setChartData(data.chartData || []);
      setGroupData(data.groupData || []);
    } catch { /* silently keep */ }
    finally { setLoading(false); }
  };

  usePolling(fetchAnalytics, [user?.telegram_id], { interval: 30000, enabled: !!user });

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <AppShell showNav={false}>
      <PageHeader title="Admin Panel" subtitle={`Logged in as ${user?.name}`} showBack={false} helpKey="home" />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Overview Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-2.5">
          <StatCard icon={<Users className="w-4 h-4" />} label="Total Users" value={analytics?.totalUsers ?? '—'} color="blue" loading={loading} />
          <StatCard icon={<UserCheck className="w-4 h-4" />} label="Leaders" value={analytics?.totalLeaders ?? '—'} color="gold" loading={loading} />
          <StatCard icon={<MessageSquare className="w-4 h-4" />} label="Total Messages" value={analytics?.totalMessages ?? '—'} color="purple" loading={loading} />
          <StatCard icon={<CheckCheck className="w-4 h-4" />} label="Total Replies" value={analytics?.totalReplies ?? '—'} color="green" loading={loading} />
        </motion.div>

        {/* Today's row */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2">
          <MiniStat label="Today Messages" value={analytics?.todayMessages ?? '—'} icon={<TrendingUp className="w-3 h-3" />} loading={loading} />
          <MiniStat label="New Users" value={analytics?.todayNewUsers ?? '—'} icon={<UserPlus className="w-3 h-3" />} loading={loading} />
          <MiniStat label="Reply Rate" value={analytics ? `${analytics.replyRate}%` : '—'} icon={<BarChart2 className="w-3 h-3" />} loading={loading} />
        </motion.div>

        {/* Alert cards */}
        {analytics && (analytics.pendingMessages > 0 || analytics.totalEmergency > 0) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="space-y-2">
            {analytics.pendingMessages > 0 && (
              <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-bold text-gold">{analytics.pendingMessages}</span> messages waiting for reply
                </p>
              </div>
            )}
            {analytics.totalEmergency > 0 && (
              <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)' }}>
                <Siren className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-bold text-red-400">{analytics.totalEmergency}</span> emergency messages total
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* 7-day chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Messages — Last 7 Days</p>
            <div className="flex items-end gap-1.5 h-24">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.count / maxCount) * 80}px` }}
                    transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                    className="w-full rounded-t-lg min-h-[4px]"
                    style={{ background: d.count > 0 ? 'var(--accent-gold)' : 'var(--border-subtle)', opacity: d.count > 0 ? 1 : 0.4 }}
                  />
                  <p className="text-[8px] text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{d.date}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Group messages breakdown */}
        {groupData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Messages by Group</p>
            <div className="space-y-3">
              {groupData.sort((a, b) => b.count - a.count).map((g, i) => {
                const maxG = Math.max(...groupData.map(x => x.count), 1);
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{g.name}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{g.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(g.count / maxG) * 100}%` }}
                        transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(to right, var(--accent-gold), var(--accent-gold-light))' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Navigation Cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="space-y-2.5">
          <p className="text-xs uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>Manage</p>

          <NavCard icon={<Users className="w-5 h-5" />} label="Manage Users"
            sublabel="View, search, assign roles, activate/deactivate"
            color="blue" onClick={() => router.push('/admin/users')} />

          <NavCard icon={<Map className="w-5 h-5" />} label="Manage Groups"
            sublabel="Create groups, map Telegram groups to internal groups"
            color="green" onClick={() => router.push('/admin/groups')} />

          <NavCard icon={<Shield className="w-5 h-5" />} label="Manage Leaders"
            sublabel="View leaders, assign or remove leader role"
            color="gold" onClick={() => router.push('/admin/users?role=leader')} />
        </motion.div>

        {/* Refresh button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={fetchAnalytics}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </motion.button>

      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, color, loading }: {
  icon: React.ReactNode; label: string; value: number | string;
  color: 'blue' | 'gold' | 'purple' | 'green'; loading: boolean;
}) {
  const colors = {
    blue: { bg: 'rgba(74,144,217,0.08)', border: 'rgba(74,144,217,0.2)', text: '#4A90D9' },
    gold: { bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)', text: 'var(--accent-gold)' },
    purple: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', text: '#a855f7' },
    green: { bg: 'rgba(76,175,120,0.08)', border: 'rgba(76,175,120,0.2)', text: '#4CAF78' },
  };
  const c = colors[color];
  return (
    <div className="rounded-2xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="mb-2" style={{ color: c.text }}>{icon}</div>
      {loading
        ? <div className="h-7 rounded w-12 mb-1 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
        : <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      }
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function MiniStat({ label, value, icon, loading }: { label: string; value: number | string; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-1 mb-1.5" style={{ color: 'var(--text-muted)' }}>{icon}</div>
      {loading
        ? <div className="h-5 rounded w-10 mb-1 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
        : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      }
      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function NavCard({ icon, label, sublabel, color, onClick }: {
  icon: React.ReactNode; label: string; sublabel: string;
  color: 'blue' | 'green' | 'gold'; onClick: () => void;
}) {
  const colors = {
    blue: { bg: 'rgba(74,144,217,0.06)', border: 'rgba(74,144,217,0.18)', icon: 'rgba(74,144,217,0.15)', iconColor: '#4A90D9' },
    green: { bg: 'rgba(76,175,120,0.06)', border: 'rgba(76,175,120,0.18)', icon: 'rgba(76,175,120,0.15)', iconColor: '#4CAF78' },
    gold: { bg: 'rgba(201,168,76,0.06)', border: 'rgba(201,168,76,0.18)', icon: 'rgba(201,168,76,0.15)', iconColor: 'var(--accent-gold)' },
  };
  const c = colors[color];
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick}
      className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.icon, color: c.iconColor }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
    </motion.button>
  );
}
