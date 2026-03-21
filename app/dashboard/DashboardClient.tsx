'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCheck, Filter, Download,
  Play, Pause, Volume2, FileText,
  FileVideo, FileAudio, Mic, X, Inbox, MessageSquare,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { useRealtimeReplies } from '@/hooks/useRealtimeQueue';
import { Message } from '@/types';
import { cn, formatRelativeTime, getMessageTypeLabel, getEmergencyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'current' | 'history';
type FilterSort = 'newest' | 'oldest';
type FilterType = 'all' | 'text' | 'audio';

export default function DashboardClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { t, isLight } = useTheme();

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
    } catch {} finally { setLoading(false); }
  };

  usePolling(fetchDashboard, [user?.telegram_id], { interval: 5000, enabled: !!user });
  useRealtimeReplies(fetchDashboard, !!user);

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

  const downloadAudio = (audioUrl: string, messageId: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(audioUrl)}&filename=reply-${messageId}.mp3`;
    const a = document.createElement('a');
    a.href = proxyUrl; a.download = `reply-${messageId}.mp3`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success(t('dashboard.download_audio'));
  };

  const downloadPDF = (content: string, leaderName: string, msgContent: string) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:Arial;max-width:600px;margin:40px auto;color:#333}
    h2{color:#F5A623}
    .msg{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}
    .reply{background:#FFF8EE;border-left:4px solid #F5A623;padding:16px}</style>
    </head><body><h2>Reply from ${leaderName}</h2>
    <div class="msg">${msgContent}</div>
    <div class="reply">${content}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reply-${Date.now()}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('dashboard.download_pdf'));
  };

  // Tab button style
  const tabStyle = (active: boolean) => ({
    background: active ? 'var(--tab-active-bg)' : (isLight ? '#EEEEF7' : 'var(--bg-elevated)'),
    color: active ? 'var(--tab-active-text)' : 'var(--text-secondary)',
    border: 'none',
    borderRadius: '14px',
    padding: '10px 16px',
    flex: 1,
    fontWeight: 600,
    fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    cursor: 'pointer', transition: 'all 0.2s',
  });

  return (
    <AppShell>
      <PageHeader title={t('dashboard.title')} helpKey="dashboard" />

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1.5 rounded-2xl" style={{ background: isLight ? '#EEEEF7' : 'var(--bg-secondary)' }}>
          <button style={tabStyle(tab === 'current')} onClick={() => setTab('current')}>
            <Clock className="w-3.5 h-3.5" /> {t('dashboard.current')}
          </button>
          <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>
            <MessageSquare className="w-3.5 h-3.5" /> {t('dashboard.history')}
          </button>
        </div>
      </div>

      <div className="px-4 pb-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">

          {tab === 'current' && (
            <motion.div key="current" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              {loading ? <SkeletonCard isLight={isLight} /> :
               currentMessage ? <CurrentMessageCard message={currentMessage} t={t} isLight={isLight} /> :
               <EmptyState icon={<Inbox className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />}
                 title={t('dashboard.no_pending')}
                 subtitle="All your messages have replies, or you haven't sent any yet."
                 action={{ label: t('dashboard.send_first'), onClick: () => router.push('/send-message') }}
                 isLight={isLight} />}
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: showFilters || activeFilterCount > 0 ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    border: `1px solid ${showFilters || activeFilterCount > 0 ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    color: showFilters || activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                  <Filter className="w-3.5 h-3.5" />
                  {t('common.filters')}
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: 'var(--accent)' }}>{activeFilterCount}</span>
                  )}
                </button>
                <span className="text-sm font-semibold ml-auto" style={{ color: isLight ? '#7B5EA7' : 'var(--accent)' }}>
                  {filteredMessages.length} messages
                </span>
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
                          value={filterLeader} onChange={setFilterLeader} isLight={isLight} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Sort</p>
                      <FilterPills options={[{ id: 'newest', label: t('common.newest') }, { id: 'oldest', label: t('common.oldest') }]}
                        value={filterSort} onChange={v => setFilterSort(v as FilterSort)} isLight={isLight} />
                    </div>
                    <div>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Reply Type</p>
                      <FilterPills options={[{ id: 'all', label: t('common.all') }, { id: 'text', label: 'Text' }, { id: 'audio', label: 'Audio' }]}
                        value={filterType} onChange={v => setFilterType(v as FilterType)} isLight={isLight} />
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

              {loading ? <>{[0,1].map(i => <SkeletonCard key={i} isLight={isLight} />)}</> :
               filteredMessages.length === 0 ? (
                <EmptyState icon={<MessageSquare className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />}
                  title={t('dashboard.no_replies')}
                  subtitle={activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Replies from leaders will appear here.'}
                  isLight={isLight} />
               ) : filteredMessages.map((msg, i) => (
                <MessageReplyCard key={msg.id} message={msg} index={i}
                  playingAudio={playingAudio} setPlayingAudio={setPlayingAudio}
                  onDownloadAudio={downloadAudio} onDownloadPDF={downloadPDF}
                  t={t} isLight={isLight} />
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function CurrentMessageCard({ message, t, isLight }: { message: Message; t: any; isLight: boolean }) {
  const leader = (message as any).leaders;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: isLight ? '#FFFFFF' : 'var(--msg-card-bg)', border: `1px solid ${isLight ? '#E0DFEE' : 'var(--msg-card-border)'}`, boxShadow: isLight ? '0 4px 20px rgba(100,100,180,0.1)' : 'none' }}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
            style={{ background: 'var(--send-btn-bg)' }}>
            {leader?.display_name?.charAt(0) || 'L'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('dashboard.to')}: <span style={{ color: 'var(--accent)' }}>{leader?.display_name}</span>
              <span className="font-normal ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(message.created_at)}</span>
            </p>
          </div>
          {message.is_emergency && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', getEmergencyColor(message.message_type))}>
              {getMessageTypeLabel(message.message_type)}
            </span>
          )}
        </div>
        {message.content && <p className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{message.content}</p>}
        {message.media_url && <MediaAttachment url={message.media_url} type={message.media_type || 'document'} isLight={isLight} />}
      </div>
      {/* Awaiting reply - yellow card like Figma */}
      <div className="mx-5 mb-5 rounded-2xl px-4 py-3 flex items-center gap-2.5"
        style={{ background: 'var(--awaiting-bg)', border: `1px solid var(--awaiting-border)` }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
          style={{ background: 'var(--accent)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--awaiting-text)' }}>
          {t('dashboard.awaiting')} {leader?.display_name}...
        </p>
      </div>
    </motion.div>
  );
}

function MessageReplyCard({ message, index, playingAudio, setPlayingAudio, onDownloadAudio, onDownloadPDF, t, isLight }: {
  message: Message; index: number; playingAudio: string | null; isLight: boolean;
  setPlayingAudio: (id: string | null) => void;
  onDownloadAudio: (url: string, id: string) => void;
  onDownloadPDF: (content: string, leaderName: string, msgContent: string) => void;
  t: (k: string) => string;
}) {
  const leader = (message as any).leaders;
  const reply = Array.isArray((message as any).replies) ? (message as any).replies[0] : (message as any).replies;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: isLight ? '#FFF8EE' : 'var(--msg-card-bg)', border: `1px solid ${isLight ? '#FFE0B0' : 'var(--msg-card-border)'}`, boxShadow: isLight ? '0 2px 12px rgba(245,166,35,0.1)' : 'none' }}>

      {/* Your message */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{t('dashboard.your_message')}</p>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(message.created_at)}</span>
        </div>
        {message.is_emergency && (
          <span className="inline-flex items-center text-xs px-3 py-1 rounded-full text-white font-semibold mb-2"
            style={{ background: 'var(--accent)' }}>
            {getMessageTypeLabel(message.message_type)}
          </span>
        )}
        {message.content && <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{message.content}</p>}
        {message.media_url && <div className="mt-2"><MediaAttachment url={message.media_url} type={message.media_type || 'document'} isLight={isLight} /></div>}
      </div>

      {/* Leader divider */}
      <div className="flex items-center gap-3 px-5 py-2.5"
        style={{ borderTop: `1px solid ${isLight ? '#FFD080' : 'var(--border-subtle)'}`, borderBottom: `1px solid ${isLight ? '#FFD080' : 'var(--border-subtle)'}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: 'var(--send-btn-bg)' }}>
          {leader?.display_name?.charAt(0)}
        </div>
        <span className="text-sm font-bold" style={{ color: isLight ? '#3D3D8F' : 'var(--text-primary)' }}>{leader?.display_name}</span>
      </div>

      {/* Reply */}
      {reply && (
        <div className="px-5 pb-5">
          {/* Reply header pill */}
          <div className="flex items-center justify-between mt-3 mb-3 px-4 py-2 rounded-2xl text-white"
            style={{ background: 'var(--reply-header-bg)' }}>
            <div className="flex items-center gap-2">
              {reply.reply_type === 'audio' ? <Mic className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              <span className="text-xs font-bold uppercase tracking-wider">{t('dashboard.reply')}</span>
            </div>
            <span className="text-xs opacity-80">{formatRelativeTime(reply.created_at)}</span>
          </div>

          {reply.reply_type === 'audio' && reply.audio_url ? (
            <AudioPlayer url={reply.audio_url} messageId={message.id}
              isPlaying={playingAudio === message.id}
              onToggle={(id: string) => setPlayingAudio(playingAudio === id ? null : id)}
              onDownload={() => onDownloadAudio(reply.audio_url, message.id)}
              isLight={isLight} t={t} />
          ) : (
            <>
              <div className="rounded-xl p-4 mb-3"
                style={{ background: isLight ? '#FFFFFF' : 'var(--bg-secondary)', border: `1px solid ${isLight ? '#E8E8F0' : 'var(--border-subtle)'}` }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{reply.content}</p>
              </div>
              <button onClick={() => onDownloadPDF(reply.content!, leader?.display_name, message.content || '')}
                className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Download className="w-3.5 h-3.5" /> {t('dashboard.download_pdf')}
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

function AudioPlayer({ url, messageId, isPlaying, onToggle, onDownload, isLight, t }: {
  url: string; messageId: string; isPlaying: boolean; isLight: boolean;
  onToggle: (id: string) => void; onDownload: () => void; t: (k: string) => string;
}) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    <div className="rounded-xl p-3 mb-3" style={{ background: isLight ? '#FFFFFF' : 'var(--bg-secondary)', border: `1px solid ${isLight ? '#E8E8F0' : 'var(--border-subtle)'}` }}>
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(messageId)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: 'var(--send-btn-bg)' }}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Audio Reply</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(duration)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--send-btn-bg)' }} />
          </div>
        </div>
        <button onClick={onDownload} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function MediaAttachment({ url, type, isLight }: { url: string; type: string; isLight: boolean }) {
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
      style={{ background: isLight ? '#FFFBEB' : 'var(--bg-secondary)', border: `1px solid ${isLight ? '#FFE090' : 'var(--border-subtle)'}` }}>
      <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>View {type} attachment</span>
    </a>
  );
}

function EmptyState({ icon, title, subtitle, action, isLight }: {
  icon: React.ReactNode; title: string; subtitle: string; isLight: boolean;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-8 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--bg-elevated)' }}>{icon}</div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--send-btn-bg)' }}>
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

function SkeletonCard({ isLight }: { isLight: boolean }) {
  return (
    <div className="rounded-2xl p-5 space-y-3 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 rounded w-32" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-2 rounded w-20" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
      <div className="h-3 rounded" style={{ background: 'var(--bg-elevated)' }} />
      <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-elevated)' }} />
    </div>
  );
}

function FilterPills({ options, value, onChange, isLight }: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  isLight: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{
            background: value === opt.id ? 'var(--send-btn-bg)' : 'var(--bg-elevated)',
            color: value === opt.id ? 'white' : 'var(--text-secondary)',
            border: 'none',
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
