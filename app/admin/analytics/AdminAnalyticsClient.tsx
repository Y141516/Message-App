'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Users, MessageSquare, Siren, CheckCheck, Clock, Map } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { usePolling } from '@/hooks/usePolling';

export default function AdminAnalyticsClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const [stats, setStats] = useState<any>(null);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [signupsByDay, setSignupsByDay] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/analytics?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) { if (data.error === 'Unauthorized') { router.replace('/home'); return; } }
      setStats(data.stats);
      setGroupCounts(data.groupCounts || {});
      setTopCities(data.topCities || []);
      setSignupsByDay(data.signupsByDay || {});
    } catch { /* silently */ }
    finally { setLoading(false); }
  };

  usePolling(fetchAnalytics, [user?.telegram_id], { interval: 30000, enabled: !!user });

  const statRows = [
    { label: 'Total Users', value: stats?.totalUsers, icon: <Users className="w-4 h-4" />, color: 'blue' },
    { label: 'Total Messages', value: stats?.totalMessages, icon: <MessageSquare className="w-4 h-4" />, color: 'gold' },
    { label: 'Total Emergency', value: stats?.totalEmergency, icon: <Siren className="w-4 h-4" />, color: 'red' },
    { label: 'Total Replies', value: stats?.totalReplies, icon: <CheckCheck className="w-4 h-4" />, color: 'green' },
    { label: 'Messages Today', value: stats?.todayMessages, icon: <TrendingUp className="w-4 h-4" />, color: 'gold' },
    { label: 'New Users Today', value: stats?.todayUsers, icon: <Users className="w-4 h-4" />, color: 'blue' },
    { label: 'Messages This Week', value: stats?.weekMessages, icon: <BarChart2 className="w-4 h-4" />, color: 'purple' },
    { label: 'Reply Rate', value: stats ? `${stats.replyRate}%` : null, icon: <Clock className="w-4 h-4" />, color: 'green' },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'rgba(59,130,246,0.08)', text: 'rgb(96,165,250)' },
    gold: { bg: 'rgba(201,168,76,0.08)', text: '#C9A84C' },
    red: { bg: 'rgba(239,68,68,0.08)', text: 'rgb(248,113,113)' },
    green: { bg: 'rgba(34,197,94,0.08)', text: 'rgb(74,222,128)' },
    purple: { bg: 'rgba(168,85,247,0.08)', text: 'rgb(192,132,252)' },
  };

  // Signups bar chart
  const signupDays = Object.entries(signupsByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  const maxSignups = Math.max(...signupDays.map(([, v]) => v), 1);

  return (
    <AppShell showNav={false}>
      <PageHeader title="Analytics" subtitle="Full system stats" showBack />

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* All stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs uppercase tracking-wider px-5 pt-4 pb-2" style={{ color: 'var(--text-muted)' }}>All Time Stats</p>
          {statRows.map((row, i) => (
            <div key={row.label} className="flex items-center gap-3 px-5 py-3"
              style={{ borderTop: i === 0 ? `1px solid var(--border-subtle)` : `1px solid var(--border-subtle)` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: colorMap[row.color].bg, color: colorMap[row.color].text }}>
                {row.icon}
              </div>
              <p className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</p>
              {loading
                ? <div className="h-5 w-12 rounded animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                : <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{row.value ?? '—'}</p>
              }
            </div>
          ))}
        </motion.div>

        {/* Signups last 7 days */}
        {signupDays.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>New Signups — Last 7 Days</p>
            <div className="flex items-end gap-2 h-24">
              {signupDays.map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(count / maxSignups) * 72}px` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#C9A84C] to-[#E8C97A] min-h-[4px]"
                  />
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{day.slice(5)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages by group */}
        {Object.keys(groupCounts).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Members by Group</p>
            {Object.entries(groupCounts).sort(([, a], [, b]) => b - a).map(([group, count]) => {
              const max = Math.max(...Object.values(groupCounts));
              return (
                <div key={group} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>{group}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]" />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Top cities */}
        {topCities.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              <Map className="w-3 h-3 inline mr-1" />Top Cities by Messages
            </p>
            {topCities.map((c, i) => (
              <div key={c.city} className="flex items-center gap-3 mb-2.5">
                <span className="text-xs font-bold w-5 text-right" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{c.city}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]"
                    style={{ width: `${Math.max(24, (c.count / (topCities[0]?.count || 1)) * 80)}px` }} />
                  <span className="text-xs w-8 text-right" style={{ color: 'var(--text-muted)' }}>{c.count}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </AppShell>
  );
}
