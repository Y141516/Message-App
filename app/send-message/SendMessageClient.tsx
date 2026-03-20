'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, X, CheckCircle2,
  Image, FileVideo, FileAudio, File, StopCircle,
  ChevronDown, Stethoscope, Car, Siren, AlertTriangle,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { Leader } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type EmergencyType = 'medical' | 'transport' | 'urgent' | null;

const EMERGENCY_CONFIG = {
  medical: {
    label: 'Medical Emergency',
    icon: Stethoscope,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    msgType: 'emergency_medical',
  },
  transport: {
    label: 'Transport Emergency',
    icon: Car,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    msgType: 'emergency_transport',
  },
  urgent: {
    label: 'Urgent Emergency',
    icon: Siren,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    msgType: 'emergency_urgent',
  },
};

export default function SendMessageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emergencyParam = searchParams.get('emergency') as EmergencyType;

  const { user, openQueues } = useUserStore();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isEmergency = !!emergencyParam;
  const emergencyConfig = emergencyParam ? EMERGENCY_CONFIG[emergencyParam] : null;

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    fetchLeaders();
  }, [user]);

  useEffect(() => {
    if (leaders.length === 1) setSelectedLeader(leaders[0]);
  }, [leaders]);

  const fetchLeaders = async () => {
    try {
      const res = await fetch('/api/leaders');
      const data = await res.json();
      setLeaders(data.leaders || []);
    } catch {
      toast.error('Could not load leaders');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large. Max 50MB.'); return; }

    setMediaFile(file);
    if (file.type.startsWith('image/')) {
      setMediaType('photo');
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video'); setMediaPreview(null);
    } else if (file.type.startsWith('audio/')) {
      setMediaType('audio'); setMediaPreview(null);
    } else {
      setMediaType('document'); setMediaPreview(null);
    }
  };

  const removeMedia = () => {
    setMediaFile(null); setMediaPreview(null); setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setMediaType('voice');
        const voiceFile = new (window.File || Blob)([blob], 'voice-note.webm', { type: 'audio/webm' }) as File;
        setMediaFile(voiceFile);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSend = async () => {
    if (!selectedLeader) { toast.error('Please select a leader'); return; }
    if (!content.trim() && !mediaFile) { toast.error('Please write a message or attach media'); return; }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('telegram_id', user!.telegram_id);
      fd.append('leader_id', selectedLeader.id);
      fd.append('content', content.trim());
      fd.append('is_emergency', String(isEmergency));
      fd.append('message_type', isEmergency ? (emergencyConfig?.msgType || 'regular') : 'regular');
      if (mediaFile) { fd.append('media', mediaFile); fd.append('media_type', mediaType || 'document'); }

      const res = await fetch('/api/messages', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'limit_reached') toast.error('You have reached your 3 emergency messages for today.');
        else if (data.error === 'already_sent') toast.error('You already sent a message in this queue.');
        else toast.error(data.message || 'Failed to send message');
        return;
      }

      setSent(true);
      setTimeout(() => router.replace('/home'), 2200);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-xl font-bold text-[#F0EDE8] mb-2">Message Sent!</motion.h2>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-[#9A9AB0] text-sm text-center">
          Delivered to {selectedLeader?.display_name}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-[#5A5A72] text-xs mt-4">Returning to home...</motion.p>
      </div>
    );
  }

  return (
    <AppShell showNav={false}>
      <PageHeader title={isEmergency ? (emergencyConfig?.label || 'Emergency') : 'Send Message'} showBack />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Emergency Banner */}
        {isEmergency && emergencyConfig && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-2xl p-4 border flex items-center gap-3', emergencyConfig.bg)}>
            <emergencyConfig.icon className={cn('w-5 h-5 flex-shrink-0', emergencyConfig.color)} />
            <div>
              <p className={cn('text-sm font-semibold', emergencyConfig.color)}>{emergencyConfig.label}</p>
              <p className="text-[#9A9AB0] text-xs">Bypasses queue — sent immediately</p>
            </div>
          </motion.div>
        )}

        {/* Leader Selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-2 font-medium">Send To</p>
          <button
            onClick={() => setShowLeaderPicker(!showLeaderPicker)}
            className={cn(
              'w-full bg-[#1A1A26] border rounded-2xl p-4 flex items-center gap-3 transition-all',
              showLeaderPicker ? 'border-[#C9A84C]/50' : 'border-[#2A2A3E] hover:border-[#3A3A52]'
            )}
          >
            {selectedLeader ? (
              <>
                <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-sm font-bold">{selectedLeader.display_name.charAt(0)}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[#F0EDE8] text-sm font-medium">{selectedLeader.display_name}</p>
                  <p className="text-[#5A5A72] text-xs">
                    {isEmergency ? 'Emergency message' :
                      openQueues.find(q => q.leader_id === selectedLeader.id) ? 'Queue open' : 'Emergency only'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-[#5A5A72] text-sm flex-1 text-left">Select a leader...</p>
            )}
            <ChevronDown className={cn('w-4 h-4 text-[#5A5A72] transition-transform flex-shrink-0', showLeaderPicker && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showLeaderPicker && (
              <motion.div
                initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
                transition={{ duration: 0.18 }}
                className="mt-1.5 bg-[#1A1A26] border border-[#C9A84C]/30 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{ transformOrigin: 'top' }}
              >
                {leaders.length === 0 && (
                  <p className="text-[#5A5A72] text-sm text-center py-4">No leaders found</p>
                )}
                {leaders.map((leader, i) => {
                  const hasOpenQueue = openQueues.some(q => q.leader_id === leader.id);
                  const canSelect = isEmergency || hasOpenQueue;
                  return (
                    <button
                      key={leader.id}
                      disabled={!canSelect}
                      onClick={() => { setSelectedLeader(leader); setShowLeaderPicker(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left',
                        i > 0 && 'border-t border-[#2A2A3E]',
                        canSelect ? 'hover:bg-[#C9A84C]/5' : 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C9A84C] text-sm font-bold">{leader.display_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#F0EDE8] text-sm font-medium">{leader.display_name}</p>
                        <p className="text-[#5A5A72] text-xs">
                          {isEmergency ? 'Emergency message' : hasOpenQueue ? '✓ Queue open' : 'Queue closed'}
                        </p>
                      </div>
                      {selectedLeader?.id === leader.id && <CheckCircle2 className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Message Input */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-2 font-medium">Message</p>
          <div className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl overflow-hidden focus-within:border-[#C9A84C]/50 transition-colors">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message here..."
              rows={5}
              maxLength={2000}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-[#F0EDE8] text-sm placeholder:text-[#5A5A72] outline-none resize-none"
            />
            <div className="px-4 pb-3 pt-1">
              <span className="text-[#3A3A52] text-xs">{content.length}/2000</span>
            </div>
          </div>
        </motion.div>

        {/* Media Attachments */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs text-[#5A5A72] uppercase tracking-wider mb-2 font-medium">
            Attach <span className="normal-case text-[#3A3A52]">(optional)</span>
          </p>

          {mediaFile ? (
            <div className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                  {mediaType === 'photo' ? <Image className="w-5 h-5 text-[#C9A84C]" /> :
                   mediaType === 'video' ? <FileVideo className="w-5 h-5 text-[#C9A84C]" /> :
                   mediaType === 'audio' || mediaType === 'voice' ? <FileAudio className="w-5 h-5 text-[#C9A84C]" /> :
                   <File className="w-5 h-5 text-[#C9A84C]" />}
                </div>
                <div className="flex-1 min-w-0">
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="preview" className="w-full max-h-40 object-cover rounded-xl" />
                  ) : (
                    <>
                      <p className="text-[#F0EDE8] text-sm font-medium truncate">
                        {mediaType === 'voice' ? 'Voice Note recorded' : mediaFile.name}
                      </p>
                      <p className="text-[#5A5A72] text-xs capitalize">{mediaType}</p>
                    </>
                  )}
                </div>
                <button onClick={removeMedia} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isRecording ? (
            <div className="bg-red-500/8 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">Recording...</p>
                <p className="text-[#9A9AB0] text-xs">{formatTime(recordingTime)}</p>
              </div>
              <button onClick={stopRecording} className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white">
                <StopCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { icon: Image, label: 'Photo', accept: 'image/*' },
                  { icon: FileVideo, label: 'Video', accept: 'video/*' },
                  { icon: FileAudio, label: 'Audio', accept: 'audio/*' },
                  { icon: File, label: 'Doc', accept: '*' },
                ].map(({ icon: Icon, label, accept }) => (
                  <button
                    key={label}
                    onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click(); } }}
                    className="bg-[#1A1A26] border border-[#2A2A3E] rounded-xl py-3 flex flex-col items-center gap-1.5 hover:border-[#C9A84C]/30 transition-all active:scale-95"
                  >
                    <Icon className="w-4 h-4 text-[#9A9AB0]" />
                    <span className="text-[#5A5A72] text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={startRecording}
                className="w-full bg-[#1A1A26] border border-[#2A2A3E] rounded-xl py-3 flex items-center justify-center gap-2 hover:border-[#C9A84C]/30 transition-all active:scale-[0.98]"
              >
                <Mic className="w-4 h-4 text-[#9A9AB0]" />
                <span className="text-[#5A5A72] text-sm">Record Voice Note</span>
              </button>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </motion.div>

        {/* Send Button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-2">
          <button
            onClick={handleSend}
            disabled={sending || !selectedLeader || (!content.trim() && !mediaFile)}
            className={cn(
              'w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
              isEmergency
                ? 'bg-red-500 text-white shadow-[0_4px_24px_rgba(224,82,82,0.4)]'
                : 'bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-[#0A0A0F] shadow-[0_4px_24px_rgba(201,168,76,0.35)]'
            )}
          >
            {sending
              ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <><Send className="w-4 h-4" />{isEmergency ? 'Send Emergency Message' : 'Send Message'}</>
            }
          </button>
          {isEmergency && (
            <p className="text-center text-[#5A5A72] text-xs mt-3 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Max 3 emergency messages per day
            </p>
          )}
        </motion.div>

      </div>
    </AppShell>
  );
}
