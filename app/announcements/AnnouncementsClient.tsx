'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Send, Users, Globe, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
}

export default function AnnouncementsClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { isLight } = useTheme();

  const [title, setTitle]             = useState('');
  const [body, setBody]               = useState('');
  const [target, setTarget]           = useState<'all' | 'group'>('all');
  const [allGroups, setAllGroups]     = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);

  // Load groups from DB dynamically
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups');
        const data = await res.json();
        setAllGroups(data.groups || []);
      } catch {
        // fallback: use user's own groups
        setAllGroups(user?.groups || []);
      }
    };
    if (user) fetchGroups();
  }, [user]);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!title.trim())                          { toast.error('Please enter a title'); return; }
    if (!body.trim())                           { toast.error('Please enter the announcement'); return; }
    if (target === 'group' && selectedGroupIds.length === 0) {
      toast.error('Please select at least one group'); return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user!.telegram_id,
          title: title.trim(),
          body: body.trim(),                  // NO character limit
          target,
          group_ids: target === 'group' ? selectedGroupIds : null,
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
          {target === 'all'
            ? 'All users have been notified via Telegram'
            : `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''} notified via Telegram`}
        </motion.p>
      </div>
    );
  }

  return (
    <AppShell showNav={false}>
      <PageHeader title="Send Announcement" subtitle="Notify users" showBack />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>
          <Megaphone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Broadcast Announcement</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Sends a Telegram message to selected users <b>and</b> shows a banner inside the app.
            </p>
          </div>
        </motion.div>

        {/* Target selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Send To
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'all',   label: 'All Users',  sub: 'Everyone',        icon: Globe },
              { id: 'group', label: 'Groups Only', sub: 'Select groups',  icon: Users },
            ].map(({ id, label, sub, icon: Icon }) => (
              <button key={id} onClick={() => setTarget(id as any)}
                className="rounded-2xl p-3.5 flex items-center gap-2.5 transition-all"
                style={{
                  background: target === id ? 'var(--send-btn-bg)' : 'var(--bg-card)',
                  border: `1px solid ${target === id ? 'transparent' : 'var(--border-subtle)'}`,
                }}>
                <Icon className="w-4 h-4 flex-shrink-0"
                  style={{ color: target === id ? 'white' : 'var(--text-muted)' }} />
                <div className="text-left">
                  <p className="text-sm font-semibold"
                    style={{ color: target === id ? 'white' : 'var(--text-primary)' }}>{label}</p>
                  <p className="text-[10px]"
                    style={{ color: target === id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Multi-select group checkboxes */}
          <AnimatePresence>
            {target === 'group' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Select groups ({selectedGroupIds.length} selected)
                </p>
                {allGroups.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading groups...</p>
                ) : (
                  allGroups.map(group => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <button key={group.id} onClick={() => toggleGroup(group.id)}
                        className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(var(--accent-rgb),0.1)' : 'var(--bg-card)',
                          border: `1px solid ${isSelected ? 'rgba(var(--accent-rgb),0.4)' : 'var(--border-subtle)'}`,
                        }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          }}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {group.name}
                        </span>
                      </button>
                    );
                  })
                )}
                {/* Select all / clear */}
                {allGroups.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setSelectedGroupIds(allGroups.map(g => g.id))}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
                      Select All
                    </button>
                    <button onClick={() => setSelectedGroupIds([])}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      Clear
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Queue opens tomorrow at 10 AM"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </motion.div>

        {/* Body — NO character limit */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Message <span className="normal-case font-normal text-[10px]">(no limit)</span>
          </p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement here... No character limit."
              rows={6}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm outline-none resize-none"
              style={{ color: 'var(--text-primary)' }} />
            <div className="px-4 pb-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{body.length} characters</span>
            </div>
          </div>
        </motion.div>

        {/* Send button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim() || (target === 'group' && selectedGroupIds.length === 0)}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--send-btn-bg)', boxShadow: `0 4px 24px rgba(var(--accent-rgb),0.35)` }}>
            {sending
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Send className="w-4 h-4" /> Send Announcement</>
            }
          </button>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Sends via Telegram bot + shows banner in-app
          </p>
        </motion.div>

      </div>
    </AppShell>
  );
}
