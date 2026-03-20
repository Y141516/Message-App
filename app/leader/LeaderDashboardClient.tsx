'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power, MessageSquare, Siren, CheckCheck,
  TrendingUp, Clock, BarChart2, ChevronRight,
  Users, Zap, Target, Activity,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LeaderStats {
  totalMessages: number;
  totalEmergency: number;
  totalReplies: number;
  todayMessages: number;
  todayReplies: number;
  pendingMessages: number;
  avgResponseHours: number;
}

interface QueueData {
  id: string;
  is_open: boolean;
  message_limit: number;
  messages_received: number;
  opened_at?: string;
}

export default function LeaderDashboardClient() {
  const router = useRouter();
  const { user } = useUserStore();

  const [queue, setQueue] = useState<QueueData | null>(null);
  const [stats, setStats] = useState<LeaderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [showLimitPicker, setShowLimitPicker] = useState(false);
  const [customLimit, setCustomLimit] = useState('100');
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    if (user.role !== 'leader' && user.role !== 'admin') {
      router.replace('/home'); return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchQueue(), fetchStats()]);
    setLoading(false);
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/leader/queue?telegram_id=${user!.telegram_id}`);
      const data = await res.json();
      setQueue(data.queue);
    } catch { /* silently fail */ }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/leader/stats?telegram_id=${user!.telegram_id}`);
      const data = await res.json();
      setStats(data.stats);
    } catch { /* silently fail */ }
  };

  const handleQueueToggle = async () => {
    if (!queue?.is_open && showLimitPicker === false) {
      setShowLimitPicker(true);
      return;
    }
    await submitQueueAction(queue?.is_open ? 'close' : 'open', parseInt(customLimit) || 100);
  };

  const submitQueueAction = async (action: 'open' | 'close', limit?: number) => {
    setQueueLoading(true);
    setShowLimitPicker(false);
    try {
      const res = await fetch('/api/leader/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user!.telegram_id,
          action,
          message_limit: limit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQueue(data.queue);

      if (action === 'open') {
        toast.success(`Queue opened for ${limit} messages! All users notified.`);
      } else {
        toast.success('Queue closed successfully.');
      }
      fetchStats();
    } catch {
      toast.error('Failed to update queue');
    } finally {
      setQueueLoading(false);
    }
  };

  const queueFillPercent = queue
    ? Math.min(100, Math.round((queue.messages_received / queue.message_limit) * 100))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell showNav={false}>
      <PageHeader title="Leader Dashboard" subtitle={`Logged in as ${user?.name}`} showBack />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Queue Control Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-3xl border overflow-hidden',
            queue?.is_open
              ? 'bg-green-500/5 border-green-500/25'
              : 'bg-[#1A1A26] border-[#2A2A3E]'
          )}
        >
          {/* Queue header */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-1">Queue Status</p>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    queue?.is_open ? 'bg-green-400 animate-pulse' : 'bg-[#3A3A52]'
                  )} />
                  <h2 className={cn(
                    'text-xl font-bold',
                    queue?.is_open ? 'text-green-400' : 'text-[#5A5A72]'
                  )}>
                    {queue?.is_open ? 'Queue Open' : 'Queue Closed'}
                  </h2>
                </div>
              </div>

              {/* Power Toggle */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleQueueToggle}
                disabled={queueLoading}
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border',
                  queue?.is_open
                    ? 'bg-green-500/15 border-green-500/40 text-green-400 hover:bg-green-500/25'
                    : 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20',
                  queueLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {queueLoading
                  ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Power className="w-6 h-6" />
                }
              </motion.button>
            </div>

            {/* Queue progress */}
            {queue?.is_open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="flex justify-between text-xs text-[#5A5A72] mb-2">
                  <span>{queue.messages_received} received</span>
                  <span>{queue.message_limit} limit</span>
                </div>
                <div className="h-2 bg-[#1A1A26] rounded-full overflow-hidden border border-[#2A2A3E]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${queueFillPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      queueFillPercent > 80
                        ? 'bg-gradient-to-r from-orange-500 to-red-500'
                        : 'bg-gradient-to-r from-green-500 to-emerald-400'
                    )}
                  />
                </div>
                <p className="text-[#5A5A72] text-xs mt-1.5 text-right">{queueFillPercent}% full</p>
              </motion.div>
            )}

            {!queue?.is_open && (
              <p className="text-[#5A5A72] text-xs">
                Tap the power button to open queue and notify all users.
              </p>
            )}
          </div>

          {/* Limit picker */}
          <AnimatePresence>
            {showLimitPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[#2A2A3E] px-5 py-4 bg-[#12121A]"
              >
                <p className="text-[#9A9AB0] text-sm font-medium mb-3">Set message limit</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {[50, 100, 150, 200].map(n => (
                    <button
                      key={n}
                      onClick={() => setCustomLimit(String(n))}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm border transition-all',
                        customLimit === String(n)
                          ? 'bg-[#C9A84C] text-[#0A0A0F] border-[#C9A84C] font-semibold'
                          : 'bg-[#1A1A26] text-[#9A9AB0] border-[#2A2A3E] hover:border-[#C9A84C]/30'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customLimit}
                    onChange={e => setCustomLimit(e.target.value)}
                    placeholder="Custom..."
                    min={1}
                    max={10000}
                    className="flex-1 bg-[#1A1A26] border border-[#2A2A3E] rounded-xl px-3 py-2 text-[#F0EDE8] text-sm outline-none focus:border-[#C9A84C]/50"
                  />
                  <button
                    onClick={() => submitQueueAction('open', parseInt(customLimit) || 100)}
                    className="px-5 py-2 bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-[#0A0A0F] rounded-xl text-sm font-semibold"
                  >
                    Open Queue
                  </button>
                </div>
                <button onClick={() => setShowLimitPicker(false)} className="text-[#5A5A72] text-xs mt-2">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2.5"
        >
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            value={stats?.pendingMessages ?? 0}
            label="Pending"
            color="gold"
          />
          <StatCard
            icon={<Siren className="w-4 h-4" />}
            value={stats?.totalEmergency ?? 0}
            label="Emergency"
            color="red"
          />
          <StatCard
            icon={<CheckCheck className="w-4 h-4" />}
            value={stats?.todayReplies ?? 0}
            label="Replied Today"
            color="green"
          />
        </motion.div>

        {/* Reply to Messages Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => router.push('/leader/messages')}
            className="w-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_24px_rgba(201,168,76,0.3)] active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-[#0A0A0F]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[#0A0A0F] font-bold text-sm">Reply to Messages</p>
              <p className="text-black/60 text-xs">
                {stats?.pendingMessages
                  ? `${stats.pendingMessages} message${stats.pendingMessages > 1 ? 's' : ''} waiting`
                  : 'View all messages'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-black/50 flex-shrink-0" />
          </button>
        </motion.div>

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-5"
        >
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-4">Today</p>
          <div className="grid grid-cols-2 gap-3">
            <TodayRow icon={<Zap className="w-3.5 h-3.5 text-[#C9A84C]" />} label="Messages received" value={stats?.todayMessages ?? 0} />
            <TodayRow icon={<CheckCheck className="w-3.5 h-3.5 text-green-400" />} label="Replies sent" value={stats?.todayReplies ?? 0} />
            <TodayRow icon={<Activity className="w-3.5 h-3.5 text-blue-400" />} label="Avg response" value={`${stats?.avgResponseHours ?? 0}h`} />
            <TodayRow icon={<Target className="w-3.5 h-3.5 text-purple-400" />} label="Total pending" value={stats?.pendingMessages ?? 0} />
          </div>
        </motion.div>

        {/* View Detailed Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 flex items-center gap-3 hover:border-[#C9A84C]/30 transition-all active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-[#F0EDE8] text-sm font-medium flex-1 text-left">View Detailed Analytics</span>
            <ChevronRight className={cn('w-4 h-4 text-[#5A5A72] transition-transform', showAnalytics && 'rotate-90')} />
          </button>

          <AnimatePresence>
            {showAnalytics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-5 space-y-3">
                  <AnalyticsRow label="Total messages received (all time)" value={stats?.totalMessages ?? 0} icon={<MessageSquare className="w-3.5 h-3.5 text-[#C9A84C]" />} />
                  <AnalyticsRow label="Total emergency messages" value={stats?.totalEmergency ?? 0} icon={<Siren className="w-3.5 h-3.5 text-red-400" />} />
                  <AnalyticsRow label="Total replies sent" value={stats?.totalReplies ?? 0} icon={<CheckCheck className="w-3.5 h-3.5 text-green-400" />} />
                  <AnalyticsRow label="Messages received today" value={stats?.todayMessages ?? 0} icon={<TrendingUp className="w-3.5 h-3.5 text-blue-400" />} />
                  <AnalyticsRow label="Messages replied today" value={stats?.todayReplies ?? 0} icon={<Zap className="w-3.5 h-3.5 text-yellow-400" />} />
                  <AnalyticsRow label="Average response time" value={`${stats?.avgResponseHours ?? 0} hours`} icon={<Clock className="w-3.5 h-3.5 text-purple-400" />} />
                  {queue && (
                    <>
                      <div className="h-px bg-[#2A2A3E]" />
                      <AnalyticsRow label="Current queue capacity" value={`${queue.messages_received} / ${queue.message_limit}`} icon={<Users className="w-3.5 h-3.5 text-[#C9A84C]" />} />
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </AppShell>
  );
}

function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode; value: number | string; label: string;
  color: 'gold' | 'red' | 'green';
}) {
  const colors = {
    gold: 'bg-[#C9A84C]/8 border-[#C9A84C]/20 text-[#C9A84C]',
    red: 'bg-red-500/8 border-red-500/20 text-red-400',
    green: 'bg-green-500/8 border-green-500/20 text-green-400',
  };
  return (
    <div className={cn('rounded-2xl border p-3.5', colors[color])}>
      <div className="mb-2">{icon}</div>
      <p className="text-xl font-bold text-[#F0EDE8]">{value}</p>
      <p className="text-[#5A5A72] text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function TodayRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-[#12121A] border border-[#2A2A3E] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[#F0EDE8] text-sm font-semibold">{value}</p>
        <p className="text-[#5A5A72] text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function AnalyticsRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon}
        <p className="text-[#9A9AB0] text-xs truncate">{label}</p>
      </div>
      <p className="text-[#F0EDE8] text-sm font-semibold flex-shrink-0">{value}</p>
    </div>
  );
}
