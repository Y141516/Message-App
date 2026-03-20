'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Clock, CheckCheck, Filter,
  Download, Play, Pause, Volume2,
  FileText, FileVideo, FileAudio, Mic, X, Inbox,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { Message } from '@/types';
import { cn, formatRelativeTime, getMessageTypeLabel, getEmergencyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'current' | 'history';
type FilterSort = 'newest' | 'oldest';
type FilterType = 'all' | 'text' | 'audio';

export default function DashboardClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { t } = useTheme();

  const [tab, setTab] = useState<Tab>('current');
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterLeader, setFilterLeader] = useState('all');
  const [filterSort, setFilterSort] = useState<FilterSort>('newest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/dashboard?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentMessage(data.currentMessage);
      setAllMessages(data.messages || []);
    } catch {
      // silently keep current data
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchDashboard, [user?.telegram_id], { interval: 10000, enabled: !!user });

  const repliedMessages = allMessages.filter(m => m.is_replied);
  const leaderMap = new Map<string, any>();
  repliedMessages.forEach(m => { if (!leaderMap.has(m.leader_id)) leaderMap.set(m.leader_id, (m as any).leaders); });
  const uniqueLeaders = Array.from(leaderMap.entries()).map(([id, l]) => ({ id, display_name: l?.display_name || 'Leader' }));

  const filteredMessages = repliedMessages
    .filter(m => filterLeader === 'all' || m.leader_id === filterLeader)
    .filter(m => {
      if (filterType === 'all') return true;
      const reply = Array.isArray((m as any).replies) ? (m as any).replies[0] : (m as any).replies;
      return filterType === 'audio' ? reply?.reply_type === 'audio' : reply?.reply_type === 'text';
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime(), db = new Date(b.created_at).getTime();
      return filterSort === 'newest' ? db - da : da - db;
    });

  const activeFilterCount = [filterLeader !== 'all', filterSort !== 'newest', filterType !== 'all'].filter(Boolean).length;

  // ─── Download via server proxy ───────────────────────
  const downloadAudio = (audioUrl: string, messageId: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(audioUrl)}&filename=reply-${messageId}.mp3`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = `reply-${messageId}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(t('dashboard.download_audio'));
  };

  const downloadPDF = (content: string, leaderName: string, msgContent: string) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#333}
    h2{color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:8px}
    .msg{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}
    .reply{background:#fff8e6;border-left:4px solid #C9A84C;padding:16px;border-radius:0 8px 8px 0}
    .label{font-size:11px;color:#999;text-transform:uppercase;margin-bottom:6px}</style>
    </head><body><h2>Message Reply</h2>
    <div class="label">Your Message</div><div class="msg">${msgContent || '(No text content)'}</div>
    <div class="label">Reply from ${leaderName}</div><div class="reply">${content}</div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reply-${leaderName}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('dashboard.download_pdf'));
  };

  return (
    <AppShell>
      <PageHeader title={t('dashboard.title')} helpKey="dashboard" />

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl p-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          {(['current', 'history'] as Tab[]).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              style={{
                background: tab === tabKey ? 'var(--bg-card)' : 'transparent',
                color: tab === tabKey ? 'var(--accent-gold)' : 'var(--text-muted)',
                border: tab === tabKey ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
              }}>
              {tabKey === 'current' ? <Clock className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
              {tabKey === 'current' ? t('dashboard.current') : t('dashboard.history')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">

          {tab === 'current' && (
            <motion.div key="current" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              {loading ? <SkeletonCard /> :
               currentMessage ? <CurrentMessageCard message={currentMessage} t={t} /> :
               <EmptyState icon={<Inbox className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />}
                 title={t('dashboard.no_pending')}
                 subtitle="All your messages have replies, or you haven't sent any yet."
                 action={{ label: t('dashboard.send_first'), onClick: () => router.push('/send-message') }} />}
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    background: showFilters || activeFilterCount > 0 ? 'rgba(201,168,76,0.1)' : 'var(--bg-card)',
                    border: `1px solid ${showFilters || activeFilterCount > 0 ? 'rgba(201,168,76,0.3)' : 'var(--border-subtle)'}`,
                    color: showFilters || activeFilterCount > 0 ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  }}>
                  <Filter className="w-3.5 h-3.5" />
                  {t('common.filters')}
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#C9A84C] text-[#0A0A0F] text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </button>
                <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{filteredMessages.length} messages</span>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl p-4 space-y-3 overflow-hidden"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    {uniqueLeaders.length > 0 && (
                      <div>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Leader</p>
                        <FilterPills options={[{ id: 'all', label: t('common.all') }, ...uniqueLeaders.map(l => ({ id: l.id, label: l.display_name }))]}
                          value={filterLeader} onChange={setFilterLeader} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Sort</p>
                      <FilterPills options={[{ id: 'newest', label: t('common.newest') }, { id: 'oldest', label: t('common.oldest') }]}
                        value={filterSort} onChange={v => setFilterSort(v as FilterSort)} />
                    </div>
                    <div>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Reply Type</p>
                      <FilterPills options={[{ id: 'all', label: t('common.all') }, { id: 'text', label: 'Text' }, { id: 'audio', label: 'Audio' }]}
                        value={filterType} onChange={v => setFilterType(v as FilterType)} />
                    </div>
                    {activeFilterCount > 0 && (
                      <button onClick={() => { setFilterLeader('all'); setFilterSort('newest'); setFilterType('all'); }}
                        className="text-xs text-red-400 flex items-center gap-1">
                        <X className="w-3 h-3" /> {t('common.reset')}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? <>{[0,1,2].map(i => <SkeletonCard key={i} />)}</> :
               filteredMessages.length === 0 ? (
                <EmptyState icon={<MessageSquare className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />}
                  title={t('dashboard.no_replies')}
                  subtitle={activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Replies from leaders will appear here.'} />
               ) : filteredMessages.map((msg, i) => (
                <MessageReplyCard key={msg.id} message={msg} index={i}
                  playingAudio={playingAudio} setPlayingAudio={setPlayingAudio}
                  onDownloadAudio={downloadAudio} onDownloadPDF={downloadPDF} t={t} />
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────

function CurrentMessageCard({ message, t }: { message: Message; t: (k: string) => string }) {
  const leader = (message as any).leaders;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span className="text-sm font-bold text-gold">{leader?.display_name?.charAt(0) || 'L'}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('dashboard.to')}: {leader?.display_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(message.created_at)}</p>
          </div>
          {message.is_emergency && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', getEmergencyColor(message.message_type))}>
              {getMessageTypeLabel(message.message_type)}
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        {message.content && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{message.content}</p>}
        {message.media_url && <MediaAttachment url={message.media_url} type={message.media_type || 'document'} />}
      </div>
      <div className="mx-5 mb-5 rounded-xl px-4 py-3 flex items-center gap-2.5"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse flex-shrink-0" />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.awaiting')} {leader?.display_name}...</p>
      </div>
    </motion.div>
  );
}

function MessageReplyCard({ message, index, playingAudio, setPlayingAudio, onDownloadAudio, onDownloadPDF, t }: {
  message: Message; index: number; playingAudio: string | null;
  setPlayingAudio: (id: string | null) => void;
  onDownloadAudio: (url: string, id: string) => void;
  onDownloadPDF: (content: string, leaderName: string, msgContent: string) => void;
  t: (k: string) => string;
}) {
  const leader = (message as any).leaders;
  const reply = Array.isArray((message as any).replies) ? (message as any).replies[0] : (message as any).replies;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('dashboard.your_message')}</p>
          <span className="ml-auto text-xs" style={{ color: 'var(--border)' }}>{formatRelativeTime(message.created_at)}</span>
        </div>
        {message.is_emergency && (
          <span className={cn('inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border mb-2', getEmergencyColor(message.message_type))}>
            {getMessageTypeLabel(message.message_type)}
          </span>
        )}
        {message.content && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{message.content}</p>}
        {message.media_url && <div className="mt-2"><MediaAttachment url={message.media_url} type={message.media_type || 'document'} /></div>}
      </div>
      <div className="flex items-center gap-3 px-5 py-2" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <span className="text-[9px] font-bold text-gold">{leader?.display_name?.charAt(0)}</span>
          </div>
          <span className="text-xs font-medium text-gold">{leader?.display_name}</span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
      </div>
      {reply && (
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center gap-2 mb-3">
            {reply.reply_type === 'audio' ? <Mic className="w-3.5 h-3.5 text-gold" /> : <FileText className="w-3.5 h-3.5 text-gold" />}
            <p className="text-xs uppercase tracking-wider text-gold">{t('dashboard.reply')}</p>
            <span className="ml-auto text-xs" style={{ color: 'var(--border)' }}>{formatRelativeTime(reply.created_at)}</span>
          </div>
          {reply.reply_type === 'audio' && reply.audio_url ? (
            <AudioPlayer url={reply.audio_url} messageId={message.id}
              isPlaying={playingAudio === message.id}
              onToggle={id => setPlayingAudio(playingAudio === id ? null : id)}
              onDownload={() => onDownloadAudio(reply.audio_url, message.id)}
              t={t} />
          ) : (
            <>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>{reply.content}</p>
              <button onClick={() => onDownloadPDF(reply.content!, leader?.display_name, message.content || '')}
                className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <Download className="w-3.5 h-3.5" /> {t('dashboard.download_pdf')}
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

function AudioPlayer({ url, messageId, isPlaying, onToggle, onDownload, t }: {
  url: string; messageId: string; isPlaying: boolean;
  onToggle: (id: string) => void; onDownload: () => void; t: (k: string) => string;
}) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [progress2, setProgress2] = useState(0);
  const [duration2, setDuration2] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    audio.onended = () => { onToggle(messageId); setProgress(0); };
    return () => { audio.pause(); audio.src = ''; };
  }, [url]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(messageId)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gold flex-shrink-0"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Volume2 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Audio Reply</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(duration)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button onClick={onDownload}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function MediaAttachment({ url, type }: { url: string; type: string }) {
  const [imgError, setImgError] = useState(false);
  if (type === 'photo' && !imgError) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
        <img src={url} alt="attachment" className="w-full max-h-48 object-cover" onError={() => setImgError(true)} />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <FileText className="w-4 h-4 text-gold" />
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>View {type} attachment</span>
    </a>
  );
}

function EmptyState({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: { label: string; onClick: () => void } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>{icon}</div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 rounded-xl text-sm font-medium transition-colors text-gold"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 space-y-3 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 rounded w-32" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-2 rounded w-20" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
      <div className="h-3 rounded w-full" style={{ background: 'var(--bg-elevated)' }} />
      <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-elevated)' }} />
    </div>
  );
}

function FilterPills({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{
            background: value === opt.id ? 'rgba(201,168,76,0.15)' : 'var(--bg-secondary)',
            color: value === opt.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
            border: `1px solid ${value === opt.id ? 'rgba(201,168,76,0.3)' : 'var(--border-subtle)'}`,
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
