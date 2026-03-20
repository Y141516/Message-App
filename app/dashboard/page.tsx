'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Clock, CheckCheck, Filter,
  ChevronDown, Download, Play, Pause, Volume2,
  FileText, Mic, X, Inbox, AlertCircle,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { Message } from '@/types';
import { cn, formatRelativeTime, getMessageTypeLabel, getEmergencyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'current' | 'history';
type FilterLeader = 'all' | string;
type FilterSort = 'newest' | 'oldest';
type FilterType = 'all' | 'text' | 'audio';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUserStore();

  const [tab, setTab] = useState<Tab>('current');
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterLeader, setFilterLeader] = useState<FilterLeader>('all');
  const [filterSort, setFilterSort] = useState<FilterSort>('newest');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Audio playback
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

  // Get unique leaders from replied messages
  const repliedMessages = allMessages.filter(m => m.is_replied);
  const uniqueLeaders = Array.from(
    new Map(repliedMessages.map(m => [m.leader_id, m.leaders])).entries()
  ).map(([id, leader]) => ({ id, ...leader as any }));

  // Apply filters to history messages
  const filteredMessages = repliedMessages
    .filter(m => filterLeader === 'all' || m.leader_id === filterLeader)
    .filter(m => {
      if (filterType === 'all') return true;
      if (filterType === 'audio') return m.replies?.[0]?.reply_type === 'audio';
      if (filterType === 'text') return m.replies?.[0]?.reply_type === 'text';
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return filterSort === 'newest' ? db - da : da - db;
    });

  const activeFilterCount = [
    filterLeader !== 'all',
    filterSort !== 'newest',
    filterType !== 'all',
  ].filter(Boolean).length;

  // ─── Downloads ────────────────────────────────────────────
  const downloadAudioReply = async (audioUrl: string, messageId: string) => {
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reply-${messageId}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audio downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const downloadTextReply = (content: string, leaderName: string, date: string) => {
    const text = `Reply from ${leaderName}\nDate: ${date}\n\n${content}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reply-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as text file');
  };

  // PDF download for text replies
  const downloadAsPDF = (content: string, leaderName: string, msgContent: string) => {
    const htmlContent = `
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #333; }
        .header { border-bottom: 2px solid #C9A84C; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: bold; color: #C9A84C; }
        .section { margin-bottom: 20px; }
        .label { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 6px; }
        .content { background: #f9f9f9; padding: 16px; border-radius: 8px; line-height: 1.6; }
        .reply { background: #fff8e6; border-left: 3px solid #C9A84C; padding: 16px; border-radius: 0 8px 8px 0; }
      </style></head><body>
      <div class="header"><div class="title">Message Reply</div><div style="color:#999;font-size:12px;margin-top:4px">Downloaded from Messenger App</div></div>
      <div class="section"><div class="label">Your Message</div><div class="content">${msgContent || '(No text content)'}</div></div>
      <div class="section"><div class="label">Reply from ${leaderName}</div><div class="reply">${content}</div></div>
      </body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reply-${leaderName}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as PDF-ready file');
  };

  return (
    <AppShell>
      <PageHeader title="Dashboard" showHelp />

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-[#12121A] rounded-2xl p-1 border border-[#2A2A3E]">
          {(['current', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5',
                tab === t
                  ? 'bg-[#1A1A26] text-[#C9A84C] shadow-sm border border-[#C9A84C]/20'
                  : 'text-[#5A5A72] hover:text-[#9A9AB0]'
              )}
            >
              {t === 'current' ? <Clock className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
              {t === 'current' ? 'Current' : 'Messages & Replies'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">

          {/* ─── CURRENT MESSAGE TAB ─── */}
          {tab === 'current' && (
            <motion.div
              key="current"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? (
                <SkeletonCard />
              ) : currentMessage ? (
                <CurrentMessageCard message={currentMessage} />
              ) : (
                <EmptyState
                  icon={<Inbox className="w-8 h-8 text-[#5A5A72]" />}
                  title="No pending messages"
                  subtitle="All your messages have received replies, or you haven't sent any yet."
                  action={{ label: 'Send a Message', onClick: () => router.push('/send-message') }}
                  canSend={true}
                />
              )}
            </motion.div>
          )}

          {/* ─── MESSAGES & REPLIES TAB ─── */}
          {tab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Filter Bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all',
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                      : 'bg-[#1A1A26] border-[#2A2A3E] text-[#9A9AB0]'
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#C9A84C] text-[#0A0A0F] text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <span className="text-[#5A5A72] text-xs ml-auto">
                  {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 space-y-3 overflow-hidden"
                  >
                    {/* Leader filter */}
                    {uniqueLeaders.length > 0 && (
                      <FilterRow label="Leader">
                        <FilterPills
                          options={[{ id: 'all', label: 'All' }, ...uniqueLeaders.map(l => ({ id: l.id, label: l.display_name }))]}
                          value={filterLeader}
                          onChange={setFilterLeader}
                        />
                      </FilterRow>
                    )}
                    {/* Sort */}
                    <FilterRow label="Sort">
                      <FilterPills
                        options={[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }]}
                        value={filterSort}
                        onChange={(v) => setFilterSort(v as FilterSort)}
                      />
                    </FilterRow>
                    {/* Type */}
                    <FilterRow label="Reply Type">
                      <FilterPills
                        options={[{ id: 'all', label: 'All' }, { id: 'text', label: 'Text' }, { id: 'audio', label: 'Audio' }]}
                        value={filterType}
                        onChange={(v) => setFilterType(v as FilterType)}
                      />
                    </FilterRow>
                    {/* Reset */}
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { setFilterLeader('all'); setFilterSort('newest'); setFilterType('all'); }}
                        className="text-xs text-red-400 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reset filters
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages List */}
              {loading ? (
                <>{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</>
              ) : filteredMessages.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="w-8 h-8 text-[#5A5A72]" />}
                  title="No replied messages"
                  subtitle={activeFilterCount > 0 ? 'Try adjusting your filters.' : "Replies from leaders will appear here."}
                />
              ) : (
                filteredMessages.map((msg, i) => (
                  <MessageReplyCard
                    key={msg.id}
                    message={msg}
                    index={i}
                    playingAudio={playingAudio}
                    setPlayingAudio={setPlayingAudio}
                    onDownloadAudio={downloadAudioReply}
                    onDownloadPDF={downloadAsPDF}
                    onDownloadText={downloadTextReply}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ─── Current Message Card ─────────────────────────────────
function CurrentMessageCard({ message }: { message: Message }) {
  const leader = message.leaders as any;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#2A2A3E]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#C9A84C] text-sm font-bold">
              {leader?.display_name?.charAt(0) || 'L'}
            </span>
          </div>
          <div>
            <p className="text-[#F0EDE8] text-sm font-medium">To: {leader?.display_name}</p>
            <p className="text-[#5A5A72] text-xs">{formatRelativeTime(message.created_at)}</p>
          </div>
          <div className="ml-auto">
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border',
              message.is_emergency
                ? getEmergencyColor(message.message_type)
                : 'text-[#9A9AB0] bg-[#2A2A3E] border-[#3A3A52]'
            )}>
              {message.is_emergency ? getMessageTypeLabel(message.message_type) : 'Message'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {message.content && (
          <p className="text-[#F0EDE8] text-sm leading-relaxed mb-3">{message.content}</p>
        )}
        {message.media_url && (
          <MediaAttachment url={message.media_url} type={message.media_type || 'document'} />
        )}
      </div>

      {/* Awaiting reply */}
      <div className="mx-5 mb-5 bg-[#12121A] border border-[#2A2A3E] rounded-xl px-4 py-3 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse flex-shrink-0" />
        <p className="text-[#9A9AB0] text-xs">Awaiting reply from {leader?.display_name}...</p>
      </div>
    </motion.div>
  );
}

// ─── Message + Reply Card ─────────────────────────────────
function MessageReplyCard({
  message, index, playingAudio, setPlayingAudio,
  onDownloadAudio, onDownloadPDF, onDownloadText,
}: {
  message: Message;
  index: number;
  playingAudio: string | null;
  setPlayingAudio: (id: string | null) => void;
  onDownloadAudio: (url: string, id: string) => void;
  onDownloadPDF: (content: string, leaderName: string, msgContent: string) => void;
  onDownloadText: (content: string, leaderName: string, date: string) => void;
}) {
  const leader = message.leaders as any;
  const reply = Array.isArray(message.replies) ? message.replies[0] : (message.replies as any);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden"
    >
      {/* Your message */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-3.5 h-3.5 text-[#5A5A72]" />
          <p className="text-[#5A5A72] text-xs uppercase tracking-wider">Your Message</p>
          <span className="ml-auto text-[#3A3A52] text-xs">{formatRelativeTime(message.created_at)}</span>
        </div>

        {message.is_emergency && (
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border mb-2',
            getEmergencyColor(message.message_type)
          )}>
            {getMessageTypeLabel(message.message_type)}
          </span>
        )}

        {message.content && (
          <p className="text-[#F0EDE8] text-sm leading-relaxed">{message.content}</p>
        )}
        {message.media_url && (
          <div className="mt-2">
            <MediaAttachment url={message.media_url} type={message.media_type || 'document'} />
          </div>
        )}
      </div>

      {/* Divider with leader name */}
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
            {reply.reply_type === 'audio'
              ? <Mic className="w-3.5 h-3.5 text-[#C9A84C]" />
              : <FileText className="w-3.5 h-3.5 text-[#C9A84C]" />
            }
            <p className="text-[#C9A84C] text-xs uppercase tracking-wider">Reply</p>
            <span className="ml-auto text-[#3A3A52] text-xs">{formatRelativeTime(reply.created_at)}</span>
          </div>

          {reply.reply_type === 'audio' && reply.audio_url ? (
            <AudioPlayer
              url={reply.audio_url}
              messageId={message.id}
              isPlaying={playingAudio === message.id}
              onToggle={(id) => setPlayingAudio(playingAudio === id ? null : id)}
              onDownload={() => onDownloadAudio(reply.audio_url!, message.id)}
            />
          ) : (
            <>
              <p className="text-[#F0EDE8] text-sm leading-relaxed mb-3">{reply.content}</p>
              <button
                onClick={() => onDownloadPDF(reply.content!, leader?.display_name, message.content || '')}
                className="flex items-center gap-1.5 text-xs text-[#9A9AB0] hover:text-[#C9A84C] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download as PDF
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Audio Player ─────────────────────────────────────────
function AudioPlayer({ url, messageId, isPlaying, onToggle, onDownload }: {
  url: string; messageId: string;
  isPlaying: boolean; onToggle: (id: string) => void; onDownload: () => void;
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="bg-[#12121A] border border-[#2A2A3E] rounded-xl p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(messageId)}
          className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-3 h-3 text-[#5A5A72]" />
            <span className="text-[#9A9AB0] text-xs">Audio Reply</span>
            <span className="ml-auto text-[#5A5A72] text-xs">{formatTime(duration)}</span>
          </div>
          <div className="h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={onDownload}
          className="w-9 h-9 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] flex items-center justify-center text-[#5A5A72] hover:text-[#C9A84C] flex-shrink-0 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Media Attachment ─────────────────────────────────────
function MediaAttachment({ url, type }: { url: string; type: string }) {
  if (type === 'photo') {
    return <img src={url} alt="attachment" className="rounded-xl max-h-48 object-cover w-full" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-[#9A9AB0] text-xs hover:text-[#C9A84C] transition-colors"
    >
      <FileText className="w-4 h-4" />
      View {type} attachment
    </a>
  );
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState({ icon, title, subtitle, action, canSend }: {
  icon: React.ReactNode; title: string; subtitle: string;
  action?: { label: string; onClick: () => void }; canSend?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-8 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#12121A] border border-[#2A2A3E] flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="text-[#F0EDE8] text-sm font-medium mb-1">{title}</p>
      <p className="text-[#5A5A72] text-xs leading-relaxed mb-4">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl text-[#C9A84C] text-sm font-medium hover:bg-[#C9A84C]/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────
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
      <div className="space-y-2">
        <div className="h-3 bg-[#2A2A3E] rounded w-full" />
        <div className="h-3 bg-[#2A2A3E] rounded w-3/4" />
      </div>
    </div>
  );
}

// ─── Filter helpers ───────────────────────────────────────
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#5A5A72] text-xs mb-2">{label}</p>
      {children}
    </div>
  );
}

function FilterPills({ options, value, onChange }: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
            value === opt.id
              ? 'bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30'
              : 'bg-[#12121A] text-[#9A9AB0] border-[#2A2A3E] hover:text-[#F0EDE8]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
