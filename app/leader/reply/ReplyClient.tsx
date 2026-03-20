'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mic, StopCircle, Send, CheckCircle2,
  MapPin, Users, Siren, FileText,
  FileVideo, FileAudio, Image, Play, Pause,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { cn, formatRelativeTime, getMessageTypeLabel, getEmergencyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReplyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messageId = searchParams.get('id');
  const { user } = useUserStore();

  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyType, setReplyType] = useState<'text' | 'audio'>('text');
  const [textReply, setTextReply] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user || !messageId) { router.replace('/leader/messages'); return; }
    fetchMessage();
  }, [user, messageId]);

  const fetchMessage = async () => {
    try {
      const params = new URLSearchParams({ telegram_id: user!.telegram_id, tab: 'unreplied', page: '0' });
      const res = await fetch(`/api/leader/messages?${params}`);
      const data = await res.json();
      const found = data.messages?.find((m: any) => m.id === messageId);
      if (found) { setMessage(found); }
      else {
        // Try replied tab
        const res2 = await fetch(`/api/leader/messages?${new URLSearchParams({ telegram_id: user!.telegram_id, tab: 'replied', page: '0' })}`);
        const data2 = await res2.json();
        const found2 = data2.messages?.find((m: any) => m.id === messageId);
        setMessage(found2 || null);
      }
    } catch {
      toast.error('Could not load message');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        if (previewAudioRef.current) {
          previewAudioRef.current.src = URL.createObjectURL(blob);
        } else {
          previewAudioRef.current = new Audio(URL.createObjectURL(blob));
        }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const togglePreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      setIsPlayingPreview(true);
    }
  };

  const handleSendReply = async () => {
    if (replyType === 'text' && !textReply.trim()) { toast.error('Please write a reply'); return; }
    if (replyType === 'audio' && !audioBlob) { toast.error('Please record an audio reply'); return; }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('telegram_id', user!.telegram_id);
      fd.append('message_id', messageId!);
      fd.append('reply_type', replyType);
      if (replyType === 'text') fd.append('content', textReply.trim());
      if (replyType === 'audio' && audioBlob) {
        const audioFile = new (window.File || Blob)([audioBlob], 'reply.webm', { type: 'audio/webm' }) as File;
        fd.append('audio', audioFile);
      }

      const res = await fetch('/api/leader/reply', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSent(true);
      setTimeout(() => router.replace('/leader/messages'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-xl font-bold text-[#F0EDE8] mb-2">Reply Sent!</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-[#9A9AB0] text-sm">User has been notified via Telegram</motion.p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[#F0EDE8] text-lg font-medium mb-2">Message not found</p>
        <button onClick={() => router.back()} className="text-[#C9A84C] text-sm">Go back</button>
      </div>
    );
  }

  const sender = message.users;
  const groups = sender?.user_groups?.map((ug: any) => ug.groups?.name).filter(Boolean) || [];
  const alreadyReplied = message.is_replied;

  return (
    <AppShell showNav={false}>
      <PageHeader title="Reply to Message" showBack />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Sender info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C]/20 to-[#8A6F2E]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] font-bold">{sender?.name?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
            <div className="flex-1">
              <p className="text-[#F0EDE8] text-sm font-semibold">{sender?.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {sender?.city && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[#5A5A72]">
                    <MapPin className="w-2.5 h-2.5" />{sender.city}
                  </span>
                )}
                {groups.map((g: string) => (
                  <span key={g} className="flex items-center gap-0.5 text-[10px] text-[#5A5A72]">
                    <Users className="w-2.5 h-2.5" />{g}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {message.is_emergency && (
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1', getEmergencyColor(message.message_type))}>
                  <Siren className="w-2.5 h-2.5" />
                  {getMessageTypeLabel(message.message_type).replace(' Emergency', '')}
                </span>
              )}
              <span className="text-[#3A3A52] text-[10px]">{formatRelativeTime(message.created_at)}</span>
            </div>
          </div>
        </motion.div>

        {/* Message content */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4">
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-2">Message</p>
          {message.content && (
            <p className="text-[#F0EDE8] text-sm leading-relaxed">{message.content}</p>
          )}
          {message.media_url && (
            <a href={message.media_url} target="_blank" rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 bg-[#12121A] border border-[#2A2A3E] rounded-xl px-3 py-2.5 hover:border-[#C9A84C]/30 transition-colors">
              {message.media_type === 'photo' ? <Image className="w-4 h-4 text-[#C9A84C]" /> :
               message.media_type === 'video' ? <FileVideo className="w-4 h-4 text-[#C9A84C]" /> :
               <FileAudio className="w-4 h-4 text-[#C9A84C]" />}
              <span className="text-[#9A9AB0] text-xs">View {message.media_type} attachment</span>
            </a>
          )}
          {!message.content && !message.media_url && (
            <p className="text-[#5A5A72] text-sm italic">(No text content)</p>
          )}
        </motion.div>

        {/* Already replied notice */}
        {alreadyReplied && message.replies?.[0] && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-green-500/8 border border-green-500/25 rounded-2xl p-4">
            <p className="text-green-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Already Replied
            </p>
            {message.replies[0].reply_type === 'text'
              ? <p className="text-[#F0EDE8] text-sm">{message.replies[0].content}</p>
              : <p className="text-[#9A9AB0] text-sm italic">Audio reply sent</p>
            }
          </motion.div>
        )}

        {/* Reply composer — only if not already replied */}
        {!alreadyReplied && (
          <>
            {/* Reply type toggle */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-2">Reply Type</p>
              <div className="flex bg-[#12121A] rounded-2xl p-1 border border-[#2A2A3E]">
                {(['text', 'audio'] as const).map(t => (
                  <button key={t} onClick={() => setReplyType(t)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                      replyType === t
                        ? 'bg-[#1A1A26] text-[#C9A84C] border border-[#C9A84C]/20'
                        : 'text-[#5A5A72] hover:text-[#9A9AB0]'
                    )}>
                    {t === 'text' ? <FileText className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {t === 'text' ? 'Text' : 'Audio'}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Text reply */}
            {replyType === 'text' && (
              <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-2">Your Reply</p>
                <div className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden focus-within:border-[#C9A84C]/50 transition-colors">
                  <textarea
                    value={textReply}
                    onChange={e => setTextReply(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={5}
                    maxLength={2000}
                    className="w-full bg-transparent px-4 pt-4 pb-2 text-[#F0EDE8] text-sm placeholder:text-[#5A5A72] outline-none resize-none"
                  />
                  <div className="px-4 pb-3 pt-1">
                    <span className="text-[#3A3A52] text-xs">{textReply.length}/2000</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Audio reply */}
            {replyType === 'audio' && (
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                className="space-y-2">
                <p className="text-xs text-[#5A5A72] uppercase tracking-wider">Audio Reply</p>

                {isRecording ? (
                  <div className="bg-red-500/8 border border-red-500/30 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-400 text-sm font-semibold">Recording...</p>
                      <p className="text-[#9A9AB0] text-xs font-mono">{fmt(recordingTime)}</p>
                    </div>
                    <button onClick={stopRecording}
                      className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-[0_4px_16px_rgba(224,82,82,0.4)]">
                      <StopCircle className="w-6 h-6" />
                    </button>
                  </div>
                ) : audioBlob ? (
                  <div className="bg-[#1A1A26] border border-[#C9A84C]/25 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={togglePreview}
                        className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] flex-shrink-0">
                        {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <p className="text-[#F0EDE8] text-sm font-medium">Recording ready</p>
                        <p className="text-[#5A5A72] text-xs">{fmt(recordingTime)} • Tap play to preview</p>
                      </div>
                      <button onClick={() => { setAudioBlob(null); setIsPlayingPreview(false); }}
                        className="text-[#5A5A72] text-xs hover:text-red-400 transition-colors">
                        Re-record
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={startRecording}
                    className="w-full bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl py-6 flex flex-col items-center gap-3 hover:border-[#C9A84C]/30 transition-all active:scale-[0.98]">
                    <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
                      <Mic className="w-6 h-6 text-[#C9A84C]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[#F0EDE8] text-sm font-medium">Tap to Record</p>
                      <p className="text-[#5A5A72] text-xs mt-0.5">Record your audio reply</p>
                    </div>
                  </button>
                )}
              </motion.div>
            )}

            {/* Send button */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <button
                onClick={handleSendReply}
                disabled={sending || (replyType === 'text' && !textReply.trim()) || (replyType === 'audio' && !audioBlob)}
                className="w-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] rounded-2xl py-4 flex items-center justify-center gap-2.5 font-semibold text-sm text-[#0A0A0F] shadow-[0_4px_24px_rgba(201,168,76,0.35)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {sending
                  ? <span className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                  : <><Send className="w-4 h-4" /> Send Reply</>
                }
              </button>
            </motion.div>
          </>
        )}

      </div>
    </AppShell>
  );
}
