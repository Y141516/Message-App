'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { usePolling } from '@/hooks/usePolling';

interface Overview {
  totalUsers: number; totalLeaders: number; totalMessages: number;
  totalReplies: number; todayMessages: number; todayNewUsers: number;
  totalEmergency: number; pendingMessages: number; replyRate: number;
}

export default function AdminAnalyticsClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [groupData, setGroupData] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/analytics?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) { if (data.error === 'Unauthorized') { router.replace('/home'); return; } return; }
      setOverview(data.overview);
      setChartData(data.chartData || []);
      setGroupData(data.groupData || []);
    } catch { /* silently */ }
    finally { setLoading(false); }
  };

  usePolling(fetchAnalytics, [user?.telegram_id], { interval: 30000, enabled: !!user });

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const maxGroup = Math.max(...groupData.map(d => d.count), 1);

  const statRows = [
    { label: 'Total Users', value: overview?.totalUsers, color: 'blue' },
    { label: 'Total Leaders', value: overview?.totalLeaders, color: 'gold' },
    { label: 'Total Messages', value: overview?.totalMessages, color: 'purple' },
    { label: 'Total Replies', value: overview?.totalReplies, color: 'green' },
    { label: 'Emergency Messages', value: overview?.totalEmergency, color: 'red' },
    { label: 'Pending Messages', value: overview?.pendingMessages, color: 'red' },
    { label: 'Messages Today', value: overview?.todayMessages, color: 'gold' },
    { label: 'New Users Today', value: overview?.todayNewUsers, color: 'blue' },
    { label: 'Reply Rate', value: overview ? `${overview.replyRate}%` : null, color: 'green' },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue:   { bg: 'rgba(59,130,246,0.08)',  text: 'rgb(96,165,250)' },
    gold:   { bg: 'rgba(201,168,76,0.08)',  text: '#C9A84C' },
    red:    { bg: 'rgba(239,68,68,0.08)',   text: 'rgb(248,113,113)' },
    green:  { bg: 'rgba(34,197,94,0.08)',   text: 'rgb(74,222,128)' },
    purple: { bg: 'rgba(168,85,247,0.08)',  text: 'rgb(192,132,252)' },
  };

  return (
    <AppShell showNav={false}>
      <PageHeader title="Analytics" subtitle="Full system stats" showBack />
      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Stats list */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs uppercase tracking-wider px-5 pt-4 pb-2" style={{ color: 'var(--text-muted)' }}>Overview</p>
          {statRows.map((row, i) => (
            <div key={row.label} className="flex items-center gap-3 px-5 py-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: colorMap[row.color].bg, color: colorMap[row.color].text }}>
                {i + 1}
              </div>
              <p className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</p>
              {loading
                ? <div className="h-5 w-12 rounded animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                : <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{row.value ?? '—'}</p>
              }
            </div>
          ))}
        </motion.div>

        {/* 7-day messages chart */}
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
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="w-full rounded-t-lg min-h-[4px]"
                    style={{ background: d.count > 0 ? 'var(--accent-gold)' : 'var(--border-subtle)' }}
                  />
                  <p className="text-[8px] text-center" style={{ color: 'var(--text-muted)' }}>{d.date}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages by group */}
        {groupData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Messages by Group</p>
            {groupData.sort((a, b) => b.count - a.count).map((g, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>{g.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{g.count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${(g.count / maxGroup) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(to right, var(--accent-gold), var(--accent-gold-light))' }} />
                </div>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </AppShell>
  );
}
