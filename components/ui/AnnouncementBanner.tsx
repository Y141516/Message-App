'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { formatRelativeTime } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  users?: { name: string; role: string };
}

export default function AnnouncementBanner() {
  const { user } = useUserStore();
  const { isLight } = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchAnnouncements();
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`/api/announcements?telegram_id=${user!.telegram_id}`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {}
  };

  const dismiss = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await fetch('/api/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user!.telegram_id, announcement_id: id }),
      });
    } catch {}
  };

  if (announcements.length === 0) return null;

  const announcement = announcements[current];

  return (
    <AnimatePresence>
      <motion.div
        key={announcement.id}
        initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
        transition={{ duration: 0.3 }}
        className="mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{
          background: isLight
            ? 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(255,140,0,0.08))'
            : 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(138,111,46,0.08))',
          border: '1px solid rgba(var(--accent-rgb),0.3)',
        }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}>
              <Megaphone className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                  📢 Announcement
                </p>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formatRelativeTime(announcement.created_at)}
                </span>
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{announcement.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{announcement.body}</p>
              {announcement.users && (
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  — {announcement.users.name}
                </p>
              )}
            </div>

            {/* Dismiss */}
            <button onClick={() => dismiss(announcement.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Multiple announcements indicator */}
          {announcements.length > 1 && (
            <div className="flex items-center justify-between mt-3 pt-2"
              style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.15)' }}>
              <div className="flex gap-1">
                {announcements.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ background: i === current ? 'var(--accent)' : 'var(--border)' }} />
                ))}
              </div>
              <div className="flex gap-2">
                {current > 0 && (
                  <button onClick={() => setCurrent(c => c - 1)}
                    className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>← Prev</button>
                )}
                {current < announcements.length - 1 && (
                  <button onClick={() => setCurrent(c => c + 1)}
                    className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Next →</button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
