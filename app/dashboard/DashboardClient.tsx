'use client';
import { useState, useEffect, useRef } from 'react';
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
import { Message } from '@/types';
import { cn, formatRelativeTime, getMessageTypeLabel, getEmergencyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'current' | 'history';
type FilterSort = 'newest' | 'oldest';
type FilterType = 'all' | 'text' | 'audio';

export default function DashboardClient() {
  const router = useRouter();
  const { user } = useUserStore();

  const [tab, setTab] = useState<Tab>('current');
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterLeader, setFilterLeader] = useState<string>('all');
  const [filterSort, setFilterSort] = useState<FilterSort>('newest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?telegram_id=${user!.telegram_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentMessage(data.currentMessage);
      setAllMessages(data.messages || []);
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoading(false);
    }
  };

  const repliedMessages = allMessages.filter(m => m.is_replied);

  // Build unique leaders list from messages
  const leaderMap = new Map<string, any>();
  repliedMessages.forEach(m => {
    if (!leaderMap.has(m.leader_id)) leaderMap.set(m.leader_id, (m as any).leaders);
  });
  const uniqueLeaders = Array.from(leaderMap.entries()).map(([id, l]) => ({ id, display_name: l?.display_name || 'Leader' }));

  const filteredMessages = repliedMessages
    .filter(m => filterLeader === 'all' || m.leader_id === filterLeader)
    .filter(m => {
      if (filterType === 'all') return true;
      const reply = Array.isArray((m as any).replies) ? (m as any).replies[0] : (m as any).replies;
      if (filterType === 'audio') return reply?.reply_type === 'audio';
      if (filterType === 'text') return reply?.reply_type === 'text';
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return filterSort === 'newest' ? db - da : da - db;
    });

  const activeFilterCount = [filterLeader !== 'all', filterSort !== 'newest', filterType !== 'all'].filter(Boolean).length;

  const downloadAudio = async (audioUrl: string, messageId: string) => {
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `reply-${messageId}.mp3`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Audio downloaded');
    } catch { toast.error('Download failed'); }
  };

  const downloadPDF = (content: string, leaderName: string, msgContent: string) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#333}
    h2{color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:8px}
    .msg{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}
    .reply{background:#fff8e6;border-left:4px solid #C9A84C;padding:16px;border-radius:0 8px 8px 0}
    .label{font-size:11px;color:#999;text-transform:uppercase;margin-bottom:6px}</style>
    </head><body>
    <h2>Message Reply</h2>
    <div class="label">Your Message</div><div class="msg">${msgContent || '(No text content)'}</div>
    <div class="label">Reply from ${leaderName}</div><div class="reply">${content}</div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reply-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  return (
    <AppShell>
      <PageHeader title="Dashboard" showHelp />

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-[#12121A] rounded-2xl p-1 border border-[#2A2A3E]">
          {(['current', 'history'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5',
                tab === t ? 'bg-[#1A1A26] text-[#C9A84C] shadow-sm border border-[#C9A84C]/20' : 'text-[#5A5A72] hover:text-[#9A9AB0]'
              )}>
              {t === 'current' ? <Clock className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
              {t === 'current' ? 'Current' : 'Messages & Replies'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">

          {/* CURRENT TAB */}
          {tab === 'current' && (
            <motion.div key="current"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>
              {loading ? <SkeletonCard /> :
               currentMessage ? <CurrentMessageCard message={currentMessage} /> :
               <EmptyState
                 icon={<Inbox className="w-8 h-8 text-[#5A5A72]" />}
                 title="No pending messages"
                 subtitle="All your messages have replies, or you haven't sent any yet."
                 action={{ label: 'Send a Message', onClick: () => router.push('/send-message') }}
               />}
            </motion.div>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <motion.div key="history"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}
              className="space-y-3">

              {/* Filter bar */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all',
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                      : 'bg-[#1A1A26] border-[#2A2A3E] text-[#9A9AB0]'
                  )}>
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#C9A84C] text-[#0A0A0F] text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <span className="text-[#5A5A72] text-xs ml-auto">{filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 space-y-3 overflow-hidden">
                    {uniqueLeaders.length > 0 && (
                      <div>
                        <p className="text-[#5A5A72] text-xs mb-2">Leader</p>
                        <FilterPills
                          options={[{ id: 'all', label: 'All' }, ...uniqueLeaders.map(l => ({ id: l.id, label: l.display_name }))]}
                          value={filterLeader} onChange={setFilterLeader} />
                      </div>
                    )}
                    <div>
                      <p className="text-[#5A5A72] text-xs mb-2">Sort</p>
                      <FilterPills options={[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }]}
                        value={filterSort} onChange={(v) => setFilterSort(v as FilterSort)} />
                    </div>
                    <div>
                      <p className="text-[#5A5A72] text-xs mb-2">Reply Type</p>
                      <FilterPills options={[{ id: 'all', label: 'All' }, { id: 'text', label: 'Text' }, { id: 'audio', label: 'Audio' }]}
                        value={filterType} onChange={(v) => setFilterType(v as FilterType)} />
                    </div>
                    {activeFilterCount > 0 && (
                      <button onClick={() => { setFilterLeader('all'); setFilterSort('newest'); setFilterType('all'); }}
                        className="text-xs text-red-400 flex items-center gap-1">
                        <X className="w-3 h-3" /> Reset filters
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? <>{[0,1,2].map(i => <SkeletonCard key={i} />)}</> :
               filteredMessages.length === 0 ? (
                <EmptyState icon={<MessageSquare className="w-8 h-8 text-[#5A5A72]" />}
                  title="No replied messages"
                  subtitle={activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Replies from leaders will appear here.'} />
               ) : (
                filteredMessages.map((msg, i) => (
                  <MessageReplyCard key={msg.id} message={msg} index={i}
                    playingAudio={playingAudio} setPlayingAudio={setPlayingAudio}
                    onDownloadAudio={downloadAudio} onDownloadPDF={downloadPDF} />
                ))
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────

function CurrentMessageCard({ message }: { message: Message }) {
  const leader = (message as any).leaders;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[#2A2A3E]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#C9A84C] text-sm font-bold">{leader?.display_name?.charAt(0) || 'L'}</span>
          </div>
          <div className="flex-1">
            <p className="text-[#F0EDE8] text-sm font-medium">To: {leader?.display_name}</p>
            <p className="text-[#5A5A72] text-xs">{formatRelativeTime(message.created_at)}</p>
          </div>
          {message.is_emergency && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', getEmergencyColor(message.message_type))}>
              {getMessageTypeLabel(message.message_type)}
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        {message.content && <p className="text-[#F0EDE8] text-sm leading-relaxed">{message.content}</p>}
        {message.media_url && (
          <MediaAttachment url={message.media_url} type={message.media_type || 'document'} />
        )}
      </div>
      <div className="mx-5 mb-5 bg-[#12121A] border border-[#2A2A3E] rounded-xl px-4 py-3 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse flex-shrink-0" />
        <p className="text-[#9A9AB0] text-xs">Awaiting reply from {leader?.display_name}...</p>
      </div>
    </motion.div>
  );
}

function MessageReplyCard({ message, index, playingAudio, setPlayingAudio, onDownloadAudio, onDownloadPDF }: {
  message: Message; index: number; playingAudio: string | null;
  setPlayingAudio: (id: string | null) => void;
  onDownloadAudio: (url: string, id: string) => void;
  onDownloadPDF: (content: string, leaderName: string, msgContent: string) => void;
}) {
  const leader = (message as any).leaders;
  const reply = Array.isArray((message as any).replies) ? (message as any).replies[0] : (message as any).replies;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden">
      {/* Your message */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-[#5A5A72]" />
          <p className="text-[#5A5A72] text-xs uppercase tracking-wider">Your Message</p>
          <span className="ml-auto text-[#3A3A52] text-xs">{formatRelativeTime(message.created_at)}</span>
        </div>
        {message.is_emergency && (
          <span className={cn('inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border mb-2', getEmergencyColor(message.message_type))}>
            {getMessageTypeLabel(message.message_type)}
          </span>
        )}
        {message.content && <p className="text-[#F0EDE8] text-sm leading-relaxed">{message.content}</p>}
        {message.media_url && (
          <div className="mt-2">
            <MediaAttachment url={message.media_url} type={message.media_type || 'document'} />
          </div>
        )}
      </div>

      {/* Leader divider */}
      <div className="flex items-center gap-3 px-5 py-2 bg-[#12121A]">
        <div className="flex-1 h-px bg-[#2A2A3E]" />
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-[#C9A84C]/15 flex items-center justify-center">
            <span className="text-[#C9A84C] text-[9px] font-bold">{leader?.display_name?.charAt(0)}</span>
          </div>
          <span className="text-[#C9A84C] text-xs font-medium">{leader?.display_name}</span>
        </div>
        <div className="flex-1 h-px bg-[#2A2A3E]" />
      </div>

      {/* Reply */}
      {reply && (
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center gap-2 mb-3">
            {reply.reply_type === 'audio' ? <Mic className="w-3.5 h-3.5 text-[#C9A84C]" /> : <FileText className="w-3.5 h-3.5 text-[#C9A84C]" />}
            <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Reply</p>
            <span className="ml-auto text-[#3A3A52] text-xs">{formatRelativeTime(reply.created_at)}</span>
          </div>
          {reply.reply_type === 'audio' && reply.audio_url ? (
            <AudioPlayer url={reply.audio_url} messageId={message.id}
              isPlaying={playingAudio === message.id}
              onToggle={(id) => setPlayingAudio(playingAudio === id ? null : id)}
              onDownload={() => onDownloadAudio(reply.audio_url, message.id)} />
          ) : (
            <>
              <p className="text-[#F0EDE8] text-sm leading-relaxed mb-3">{reply.content}</p>
              <button onClick={() => onDownloadPDF(reply.content!, leader?.display_name, message.content || '')}
                className="flex items-center gap-1.5 text-xs text-[#9A9AB0] hover:text-[#C9A84C] transition-colors">
                <Download className="w-3.5 h-3.5" /> Download as PDF
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

function AudioPlayer({ url, messageId, isPlaying, onToggle, onDownload }: {
  url: string; messageId: string; isPlaying: boolean;
  onToggle: (id: string) => void; onDownload: () => void;
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
    <div className="bg-[#12121A] border border-[#2A2A3E] rounded-xl p-3">
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(messageId)}
          className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] flex-shrink-0">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Volume2 className="w-3 h-3 text-[#5A5A72]" />
            <span className="text-[#9A9AB0] text-xs">Audio Reply</span>
            <span className="ml-auto text-[#5A5A72] text-xs">{fmt(duration)}</span>
          </div>
          <div className="h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button onClick={onDownload}
          className="w-9 h-9 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] flex items-center justify-center text-[#5A5A72] hover:text-[#C9A84C] flex-shrink-0 transition-colors">
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
      <div className="mt-2 rounded-xl overflow-hidden border border-[#2A2A3E]">
        <img
          src={url}
          alt="attachment"
          className="w-full max-h-48 object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const icons: Record<string, React.ReactNode> = {
    video: <FileVideo className="w-4 h-4 text-[#C9A84C]" />,
    audio: <FileAudio className="w-4 h-4 text-[#C9A84C]" />,
    voice: <Mic className="w-4 h-4 text-[#C9A84C]" />,
    document: <FileText className="w-4 h-4 text-[#C9A84C]" />,
    photo: <FileText className="w-4 h-4 text-[#C9A84C]" />,
  };

  const labels: Record<string, string> = {
    video: 'Video attachment',
    audio: 'Audio attachment',
    voice: 'Voice note',
    document: 'Document',
    photo: 'Image attachment',
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2.5 bg-[#12121A] border border-[#2A2A3E] rounded-xl px-3 py-2.5 hover:border-[#C9A84C]/30 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
        {icons[type] || <FileText className="w-4 h-4 text-[#C9A84C]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#F0EDE8] text-xs font-medium truncate">{labels[type] || 'Attachment'}</p>
        <p className="text-[#5A5A72] text-[10px]">Tap to open</p>
      </div>
      <Download className="w-3.5 h-3.5 text-[#5A5A72] group-hover:text-[#C9A84C] transition-colors flex-shrink-0" />
    </a>
  );
}

function EmptyState({ icon, title, subtitle, action }: {
  icon: React.ReactNode; title: string; subtitle: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#12121A] border border-[#2A2A3E] flex items-center justify-center mx-auto mb-4">{icon}</div>
      <p className="text-[#F0EDE8] text-sm font-medium mb-1">{title}</p>
      <p className="text-[#5A5A72] text-xs leading-relaxed mb-4">{subtitle}</p>
      {action && (
        <button onClick={action.onClick}
          className="px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl text-[#C9A84C] text-sm font-medium hover:bg-[#C9A84C]/20 transition-colors">
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#2A2A3E]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#2A2A3E] rounded w-32" />
          <div className="h-2 bg-[#2A2A3E] rounded w-20" />
        </div>
      </div>
      <div className="h-3 bg-[#2A2A3E] rounded w-full" />
      <div className="h-3 bg-[#2A2A3E] rounded w-3/4" />
    </div>
  );
}

function FilterPills({ options, value, onChange }: {
  options: { id: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
            value === opt.id
              ? 'bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30'
              : 'bg-[#12121A] text-[#9A9AB0] border-[#2A2A3E] hover:text-[#F0EDE8]'
          )}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
