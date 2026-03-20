'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageSquarePlus, LayoutDashboard, BookOpen,
  CheckCircle2, Stethoscope, Car, Siren,
  ChevronRight, Wifi, WifiOff, Lock,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeClient() {
  const router = useRouter();
  const { user, openQueues, setOpenQueues } = useUserStore();
  const { t } = useTheme();

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    if (user.role === 'leader' || user.role === 'admin') { router.replace('/leader'); return; }
  }, [user]);

  const fetchQueues = async () => {
    try {
      const res = await fetch('/api/queues');
      const data = await res.json();
      setOpenQueues(data.queues || []);
    } catch { /* keep current state */ }
  };

  // Poll every 10s — auto-pauses when tab hidden, resumes immediately on focus
  usePolling(fetchQueues, [user?.telegram_id], { interval: 10000, enabled: !!user });

  const hasOpenQueue = openQueues.length > 0;

  const handleSendMessage = () => {
    if (!hasOpenQueue) {
      toast(t('home.queue_closed_btn'), {
        icon: '🔒',
        style: { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
      });
      return;
    }
    router.push('/send-message');
  };

  const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as any } },
  };

  return (
    <AppShell>
      <PageHeader title="" helpKey="home" />
      <div className="px-4 pt-2 pb-4 max-w-lg mx-auto">

        {/* Greeting */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="mb-6">
          <motion.p variants={fadeUp} className="text-sm font-medium tracking-wider mb-1 text-gold">{t('home.greeting')}</motion.p>
          <motion.h1 variants={fadeUp} className="text-2xl font-bold" style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary)' }}>
            {user?.name || 'Welcome'}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </motion.p>
        </motion.div>

        {/* Groups */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('home.groups')}</p>
          {user?.groups?.length ? (
            <div className="flex flex-col gap-2">
              {user.groups.map(g => (
                <div key={g.id} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                  <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    {t('home.verified')}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No groups assigned</p>}
        </motion.div>

        {/* Queue Status */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={cn('rounded-2xl p-3 mb-4 flex items-center gap-3', hasOpenQueue ? 'bg-green-500/8 border border-green-500/20' : '')}
          style={!hasOpenQueue ? { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' } : {}}>
          {hasOpenQueue ? (
            <>
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Wifi className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 text-sm font-medium">{t('home.queue_open')}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {openQueues.length} leader{openQueues.length > 1 ? 's' : ''} {t('home.queue_open_sub')}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                <WifiOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('home.queue_closed')}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('home.queue_closed_sub')}</p>
              </div>
            </>
          )}
        </motion.div>

        {/* Send Message */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-4">
          <button onClick={handleSendMessage}
            className={cn('w-full rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] border',
              hasOpenQueue
                ? 'bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] border-transparent shadow-[0_4px_24px_rgba(201,168,76,0.35)]'
                : 'opacity-60 cursor-not-allowed'
            )}
            style={!hasOpenQueue ? { background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' } : {}}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', hasOpenQueue ? 'bg-black/20' : '')}
              style={!hasOpenQueue ? { background: 'var(--bg-elevated)' } : {}}>
              {hasOpenQueue ? <MessageSquarePlus className="w-5 h-5 text-[#0A0A0F]" /> : <Lock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
            </div>
            <div className="flex-1 text-left">
              <p className={cn('font-semibold text-sm', hasOpenQueue ? 'text-[#0A0A0F]' : '')} style={!hasOpenQueue ? { color: 'var(--text-muted)' } : {}}>
                {t('home.send_message')}
              </p>
              <p className={cn('text-xs mt-0.5', hasOpenQueue ? 'text-black/60' : '')} style={!hasOpenQueue ? { color: 'var(--text-muted)' } : {}}>
                {hasOpenQueue ? t('home.send_message_sub') : t('home.queue_closed_btn')}
              </p>
            </div>
            {hasOpenQueue && <ChevronRight className="w-4 h-4 text-[#0A0A0F]/60 flex-shrink-0" />}
          </button>
        </motion.div>

        {/* Action Cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3 mb-6">
          <ActionCard icon={<LayoutDashboard className="w-5 h-5" />} label={t('nav.dashboard')} sublabel="Your messages" color="gold" onClick={() => router.push('/dashboard')} />
          <ActionCard icon={<BookOpen className="w-5 h-5" />} label={t('nav.vachan')} sublabel="Daily inspiration" color="purple" onClick={() => router.push('/vachan')} />
        </motion.div>

        {/* Emergency */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{t('home.emergency')}</p>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>{t('home.always_active')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <EmergencyCard icon={<Stethoscope className="w-5 h-5" />} label={t('home.medical')} color="red" onClick={() => router.push('/send-message?emergency=medical')} />
            <EmergencyCard icon={<Car className="w-5 h-5" />} label={t('home.transport')} color="blue" onClick={() => router.push('/send-message?emergency=transport')} />
            <EmergencyCard icon={<Siren className="w-5 h-5" />} label={t('home.urgent')} color="orange" onClick={() => router.push('/send-message?emergency=urgent')} />
          </div>
          <p className="text-[10px] text-center mt-3" style={{ color: 'var(--border)' }}>{t('home.emergency_limit')}</p>
        </motion.div>

      </div>
    </AppShell>
  );
}

function ActionCard({ icon, label, sublabel, color, onClick }: { icon: React.ReactNode; label: string; sublabel: string; color: 'gold' | 'purple'; onClick: () => void }) {
  const colors = {
    gold: { bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)', icon: 'rgba(201,168,76,0.15)', iconColor: 'var(--accent-gold)' },
    purple: { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.18)', icon: 'rgba(168,85,247,0.12)', iconColor: '#a855f7' },
  };
  const c = colors[color];
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      className="rounded-2xl p-4 text-left transition-all"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: c.icon, color: c.iconColor }}>{icon}</div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
    </motion.button>
  );
}

function EmergencyCard({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: 'red' | 'blue' | 'orange'; onClick: () => void }) {
  const colors = {
    red: 'bg-red-500/10 border-red-500/25 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
    orange: 'bg-orange-500/10 border-orange-500/25 text-orange-400',
  };
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
      className={cn('rounded-2xl p-3 border flex flex-col items-center gap-2 transition-all', colors[color])}>
      {icon}
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
    </motion.button>
  );
}
