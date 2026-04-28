'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Send, Users, Globe, ChevronDown, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function AnnouncementsClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { isLight } = useTheme();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'group'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const groups = user?.groups || [];

  const handleSend = async () => {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (!body.trim()) { toast.error('Please enter the announcement body'); return; }
    if (target === 'group' && !selectedGroupId) { toast.error('Please select a group'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user!.telegram_id,
          title: title.trim(),
          body: body.trim(),
          target,
          group_id: target === 'group' ? selectedGroupId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
      setTimeout(() => router.back(), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--bg-primary)' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(76,175,120,0.1)', border: '2px solid rgba(76,175,120,0.4)' }}>
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Announcement Sent!
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          All users have been notified via Telegram
        </motion.p>
      </div>
    );
  }

  return (
    <AppShell showNav={false}>
      <PageHeader title="Send Announcement" subtitle="Notify all users" showBack />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Info card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
          <Megaphone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Broadcast Announcement</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This will send a Telegram message to all selected users AND show a banner inside the app.
            </p>
          </div>
        </motion.div>

        {/* Target selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Send To</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTarget('all')}
              className="rounded-2xl p-3.5 flex items-center gap-2.5 transition-all"
              style={{
                background: target === 'all' ? 'var(--send-btn-bg)' : 'var(--bg-card)',
                border: `1px solid ${target === 'all' ? 'transparent' : 'var(--border-subtle)'}`,
              }}>
              <Globe className="w-4 h-4" style={{ color: target === 'all' ? 'white' : 'var(--text-muted)' }} />
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: target === 'all' ? 'white' : 'var(--text-primary)' }}>All Users</p>
                <p className="text-[10px]" style={{ color: target === 'all' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>Everyone</p>
              </div>
            </button>
            <button onClick={() => setTarget('group')}
              className="rounded-2xl p-3.5 flex items-center gap-2.5 transition-all"
              style={{
                background: target === 'group' ? 'var(--send-btn-bg)' : 'var(--bg-card)',
                border: `1px solid ${target === 'group' ? 'transparent' : 'var(--border-subtle)'}`,
              }}>
              <Users className="w-4 h-4" style={{ color: target === 'group' ? 'white' : 'var(--text-muted)' }} />
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: target === 'group' ? 'white' : 'var(--text-primary)' }}>Group Only</p>
                <p className="text-[10px]" style={{ color: target === 'group' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>Specific group</p>
              </div>
            </button>
          </div>

          {/* Group picker */}
          <AnimatePresence>
            {target === 'group' && groups.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: selectedGroupId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <option value="">Select a group...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Queue opens tomorrow at 10 AM"
            maxLength={100}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </motion.div>

        {/* Body */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Message</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement here..."
              rows={5} maxLength={500}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm outline-none resize-none"
              style={{ color: 'var(--text-primary)' }} />
            <div className="px-4 pb-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{body.length}/500</span>
            </div>
          </div>
        </motion.div>

        {/* Send button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--send-btn-bg)', boxShadow: `0 4px 24px rgba(var(--accent-rgb),0.35)` }}>
            {sending
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Send className="w-4 h-4" /> Send Announcement</>
            }
          </button>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Will be sent via Telegram bot + shown in-app
          </p>
        </motion.div>

      </div>
    </AppShell>
  );
}
