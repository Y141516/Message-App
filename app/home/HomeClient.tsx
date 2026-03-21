'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageSquarePlus, LayoutDashboard, BookOpen,
  CheckCircle2, Stethoscope, ArrowLeftRight, AlertTriangle,
  ChevronRight, BarChart2, Lock,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeClient() {
  const router = useRouter();
  const { user, openQueues, setOpenQueues } = useUserStore();
  const { t, isLight } = useTheme();

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    if (user.role === 'leader' || user.role === 'admin') { router.replace('/leader'); return; }
  }, [user]);

  const fetchQueues = async () => {
    try {
      const res = await fetch('/api/queues');
      const data = await res.json();
      setOpenQueues(data.queues || []);
    } catch {}
  };

  useRealtimeQueue(fetchQueues, !!user);
  usePolling(fetchQueues, [user?.telegram_id], { interval: 5000, enabled: !!user });

  const hasOpenQueue = openQueues.length > 0;

  const handleSendMessage = () => {
    if (!hasOpenQueue) {
      toast(t('home.queue_closed_btn'), { icon: '🔒',
        style: { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' } });
      return;
    }
    router.push('/send-message');
  };

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 },
  });

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Greeting */}
        <motion.div {...fadeUp(0)} className="mb-5">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>{t('home.greeting')}</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif', color: isLight ? '#3D3D8F' : 'var(--text-primary)' }}>
            {user?.name || 'Welcome'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </motion.div>

        {/* Groups Card */}
        <motion.div {...fadeUp(0.07)} className="rounded-2xl p-4 mb-3"
          style={{ background: 'var(--group-card-bg)', border: '1px solid var(--group-card-border)', boxShadow: isLight ? '0 2px 12px rgba(0,196,140,0.08)' : 'none' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: isLight ? '#00A37A' : 'var(--text-muted)' }}>{t('home.groups')}</p>
          {user?.groups?.length ? user.groups.map(g => (
            <div key={g.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#00C48C' }}>
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{g.name}</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: '#00C48C' }}>
                {t('home.verified')}
              </span>
            </div>
          )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No groups assigned</p>}
        </motion.div>

        {/* Queue Status */}
        <motion.div {...fadeUp(0.1)} className="rounded-2xl p-4 mb-3 flex items-center gap-3"
          style={{ background: 'var(--queue-open-bg)', border: '1px solid var(--queue-open-border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: hasOpenQueue ? '#00C48C' : 'var(--bg-elevated)' }}>
            <BarChart2 className="w-6 h-6" style={{ color: hasOpenQueue ? 'white' : 'var(--text-muted)' }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: hasOpenQueue ? (isLight ? '#007A5E' : '#4CAF78') : 'var(--text-secondary)' }}>
              {hasOpenQueue ? t('home.queue_open') : t('home.queue_closed')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {hasOpenQueue
                ? `${openQueues.length} ${t('home.queue_open_sub')}`
                : t('home.queue_closed_sub')}
            </p>
          </div>
          {hasOpenQueue && <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />}
        </motion.div>

        {/* Send Message Button */}
        <motion.div {...fadeUp(0.13)} className="mb-4">
          <button onClick={handleSendMessage}
            className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
            style={{
              background: hasOpenQueue ? 'var(--send-btn-bg)' : 'var(--bg-card)',
              border: hasOpenQueue ? 'none' : '1px solid var(--border-subtle)',
              boxShadow: hasOpenQueue ? '0 4px 20px rgba(245,166,35,0.4)' : 'none',
              opacity: hasOpenQueue ? 1 : 0.6,
              cursor: hasOpenQueue ? 'pointer' : 'not-allowed',
            }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: hasOpenQueue ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)' }}>
              {hasOpenQueue
                ? <MessageSquarePlus className="w-5 h-5 text-white" />
                : <Lock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-base" style={{ color: hasOpenQueue ? 'white' : 'var(--text-muted)' }}>
                {t('home.send_message')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: hasOpenQueue ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                {hasOpenQueue ? t('home.send_message_sub') : t('home.queue_closed_btn')}
              </p>
            </div>
            {hasOpenQueue && <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />}
          </button>
        </motion.div>

        {/* Action Cards — Dashboard + Vachan */}
        <motion.div {...fadeUp(0.16)} className="grid grid-cols-2 gap-3 mb-5">
          <ActionCard
            icon={<LayoutDashboard className="w-5 h-5 text-white" />}
            label="Dashboard" sublabel="Your messages"
            iconBg={isLight ? 'linear-gradient(135deg,#5B6EF5,#7B8FF8)' : 'rgba(201,168,76,0.2)'}
            cardBg={isLight ? '#EEF0FD' : 'var(--bg-card)'}
            cardBorder={isLight ? '#D0D5FA' : 'var(--border-subtle)'}
            labelColor={isLight ? '#3D3D8F' : 'var(--text-primary)'}
            onClick={() => router.push('/dashboard')}
          />
          <ActionCard
            icon={<BookOpen className="w-5 h-5 text-white" />}
            label="Vachan" sublabel="Daily inspiration"
            iconBg={isLight ? 'linear-gradient(135deg,#9B5DE5,#C77DFF)' : 'rgba(168,85,247,0.2)'}
            cardBg={isLight ? '#F3EEFF' : 'var(--bg-card)'}
            cardBorder={isLight ? '#E0D0FA' : 'var(--border-subtle)'}
            labelColor={isLight ? '#7B3DAF' : 'var(--text-primary)'}
            onClick={() => router.push('/vachan')}
          />
        </motion.div>

        {/* Emergency Services */}
        <motion.div {...fadeUp(0.19)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('home.emergency')}</p>
            <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: '#00C48C' }}>
              {t('home.always_active')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <EmergencyCard
              icon={<span className="text-2xl">❤️</span>}
              iconBg={isLight ? 'linear-gradient(135deg,#FF4B4B,#FF6B6B)' : 'rgba(239,68,68,0.2)'}
              cardBg={isLight ? '#FFE8E8' : 'rgba(239,68,68,0.08)'}
              cardBorder={isLight ? '#FFCDD2' : 'rgba(239,68,68,0.2)'}
              label={t('home.medical')}
              labelColor={isLight ? '#CC2222' : '#f87171'}
              onClick={() => router.push('/send-message?emergency=medical')} />
            <EmergencyCard
              icon={<ArrowLeftRight className="w-5 h-5 text-white" />}
              iconBg={isLight ? 'linear-gradient(135deg,#1E90FF,#4DAAFF)' : 'rgba(59,130,246,0.2)'}
              cardBg={isLight ? '#E3F2FF' : 'rgba(59,130,246,0.08)'}
              cardBorder={isLight ? '#B3D9FF' : 'rgba(59,130,246,0.2)'}
              label={t('home.transport')}
              labelColor={isLight ? '#1565C0' : '#60a5fa'}
              onClick={() => router.push('/send-message?emergency=transport')} />
            <EmergencyCard
              icon={<AlertTriangle className="w-5 h-5 text-white" />}
              iconBg={isLight ? 'linear-gradient(135deg,#FF8C00,#FFA500)' : 'rgba(249,115,22,0.2)'}
              cardBg={isLight ? '#FFF4E0' : 'rgba(249,115,22,0.08)'}
              cardBorder={isLight ? '#FFE0A0' : 'rgba(249,115,22,0.2)'}
              label={t('home.urgent')}
              labelColor={isLight ? '#B35A00' : '#fb923c'}
              onClick={() => router.push('/send-message?emergency=urgent')} />
          </div>
          <p className="text-[10px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>{t('home.emergency_limit')}</p>
        </motion.div>

      </div>
    </AppShell>
  );
}

function ActionCard({ icon, label, sublabel, iconBg, cardBg, cardBorder, labelColor, onClick }: any) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      className="rounded-2xl p-4 text-left transition-all"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: iconBg }}>{icon}</div>
      <p className="text-sm font-bold" style={{ color: labelColor }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
    </motion.button>
  );
}

function EmergencyCard({ icon, iconBg, cardBg, cardBorder, label, labelColor, onClick }: any) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
      className="rounded-2xl p-3 flex flex-col items-center gap-2.5 transition-all"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: iconBg }}>{icon}</div>
      <span className="text-xs font-bold" style={{ color: labelColor }}>{label}</span>
    </motion.button>
  );
}
