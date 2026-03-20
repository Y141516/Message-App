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
import { useUserStore } from '@/store/userStore';
import { Queue } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function HomeClient() {
  const router = useRouter();
  const { user, openQueues, setOpenQueues } = useUserStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    // Leaders should never see this page
    if (user.role === 'leader' || user.role === 'admin') {
      router.replace('/leader'); return;
    }
    fetchQueues();
  }, [user]);

  const fetchQueues = async () => {
    try {
      const res = await fetch('/api/queues');
      const data = await res.json();
      setOpenQueues(data.queues || []);
    } catch { /* show queue as closed */ }
    finally { setLoading(false); }
  };

  const hasOpenQueue = openQueues.length > 0;

  const handleSendMessage = () => {
    if (!hasOpenQueue) {
      toast('Queue is currently closed', {
        icon: '🔒',
        style: { background: '#1A1A26', color: '#9A9AB0', border: '1px solid #3A3A52' },
      });
      return;
    }
    router.push('/send-message');
  };

  const handleEmergency = (type: 'medical' | 'transport' | 'urgent') => {
    router.push(`/send-message?emergency=${type}`);
  };

  const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as any } },
  };

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Greeting */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="mb-6">
          <motion.p variants={fadeUp} className="text-[#C9A84C] text-sm font-medium tracking-wider mb-1">
            Jay Bhagwanji
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-2xl font-bold text-[#F0EDE8]"
            style={{ fontFamily: 'Cinzel, serif' }}>
            {user?.name || 'Welcome'}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#5A5A72] text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </motion.p>
        </motion.div>

        {/* Groups */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 mb-4">
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-3 font-medium">Your Groups</p>
          {user?.groups && user.groups.length > 0 ? (
            <div className="flex flex-col gap-2">
              {user.groups.map((group) => (
                <div key={group.id} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-[#F0EDE8] text-sm font-medium">{group.name}</span>
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

        {/* Queue Status Banner */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'rounded-2xl p-3 mb-4 flex items-center gap-3',
            hasOpenQueue ? 'bg-green-500/8 border border-green-500/20' : 'bg-[#1A1A26] border border-[#2A2A3E]'
          )}>
          {hasOpenQueue ? (
            <>
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Wifi className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 text-sm font-medium">Queue is Open</p>
                <p className="text-[#5A5A72] text-xs">
                  {openQueues.length} leader{openQueues.length > 1 ? 's' : ''} accepting messages
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl bg-[#2A2A3E] flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-4 h-4 text-[#5A5A72]" />
              </div>
              <div>
                <p className="text-[#9A9AB0] text-sm font-medium">Queue is Closed</p>
                <p className="text-[#5A5A72] text-xs">Messages not accepted right now</p>
              </div>
            </>
          )}
        </motion.div>

        {/* Send Message Button */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }} className="mb-4">
          <button onClick={handleSendMessage}
            className={cn(
              'w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] border',
              hasOpenQueue
                ? 'bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] border-transparent shadow-[0_4px_24px_rgba(201,168,76,0.35)]'
                : 'bg-[#1A1A26] border-[#2A2A3E] opacity-60 cursor-not-allowed'
            )}>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              hasOpenQueue ? 'bg-black/20' : 'bg-[#2A2A3E]'
            )}>
              {hasOpenQueue
                ? <MessageSquarePlus className="w-5 h-5 text-[#0A0A0F]" />
                : <Lock className="w-5 h-5 text-[#5A5A72]" />}
            </div>
            <div className="flex-1 text-left">
              <p className={cn('font-semibold text-sm', hasOpenQueue ? 'text-[#0A0A0F]' : 'text-[#5A5A72]')}>
                Send Message
              </p>
              <p className={cn('text-xs mt-0.5', hasOpenQueue ? 'text-black/60' : 'text-[#3A3A52]')}>
                {hasOpenQueue ? 'Tap to compose a message' : 'Queue is currently closed'}
              </p>
            </div>
            {hasOpenQueue && <ChevronRight className="w-4 h-4 text-[#0A0A0F]/60 flex-shrink-0" />}
          </button>
        </motion.div>

        {/* Main Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3 mb-6">
          <ActionCard icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard"
            sublabel="Your messages" color="gold" onClick={() => router.push('/dashboard')} />
          <ActionCard icon={<BookOpen className="w-5 h-5" />} label="Vachan"
            sublabel="Daily inspiration" color="purple" onClick={() => router.push('/vachan')} />
        </motion.div>

        {/* Emergency Services */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs text-[#5A5A72] uppercase tracking-wider font-medium">Emergency Services</p>
            <div className="flex-1 h-px bg-[#1A1A26]" />
            <span className="text-[10px] text-[#5A5A72] bg-[#1A1A26] px-2 py-0.5 rounded-full">Always Active</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <EmergencyCard icon={<Stethoscope className="w-5 h-5" />} label="Medical" color="red" onClick={() => handleEmergency('medical')} />
            <EmergencyCard icon={<Car className="w-5 h-5" />} label="Transport" color="blue" onClick={() => handleEmergency('transport')} />
            <EmergencyCard icon={<Siren className="w-5 h-5" />} label="Urgent" color="orange" onClick={() => handleEmergency('urgent')} />
          </div>
          <p className="text-[10px] text-[#3A3A52] text-center mt-3">Max 3 emergency messages per day</p>
        </motion.div>

      </div>
    </AppShell>
  );
}

function ActionCard({ icon, label, sublabel, color, onClick }: {
  icon: React.ReactNode; label: string; sublabel: string;
  color: 'gold' | 'purple'; onClick: () => void;
}) {
  const colors = {
    gold: { bg: 'bg-[#C9A84C]/10', border: 'border-[#C9A84C]/20', icon: 'bg-[#C9A84C]/15 text-[#C9A84C]' },
    purple: { bg: 'bg-purple-500/8', border: 'border-purple-500/20', icon: 'bg-purple-500/15 text-purple-400' },
  };
  const c = colors[color];
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      className={cn('rounded-2xl p-4 border text-left transition-all', c.bg, c.border)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', c.icon)}>{icon}</div>
      <p className="text-[#F0EDE8] text-sm font-semibold">{label}</p>
      <p className="text-[#5A5A72] text-xs mt-0.5">{sublabel}</p>
    </motion.button>
  );
}

function EmergencyCard({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color: 'red' | 'blue' | 'orange'; onClick: () => void;
}) {
  const colors = {
    red: 'bg-red-500/10 border-red-500/25 text-red-400 active:bg-red-500/20',
    blue: 'bg-blue-500/10 border-blue-500/25 text-blue-400 active:bg-blue-500/20',
    orange: 'bg-orange-500/10 border-orange-500/25 text-orange-400 active:bg-orange-500/20',
  };
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
      className={cn('rounded-2xl p-3 border flex flex-col items-center gap-2 transition-all', colors[color])}>
      {icon}
      <span className="text-xs font-medium text-[#F0EDE8]">{label}</span>
    </motion.button>
  );
}
