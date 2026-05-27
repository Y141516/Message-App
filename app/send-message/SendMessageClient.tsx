'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, X, CheckCircle2, Image,
  FileVideo, FileAudio, File, StopCircle,
  ChevronDown, Stethoscope, Car, Siren,
  AlertTriangle, Play, Pause,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { Leader } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type EmergencyType = 'medical' | 'transport' | 'urgent' | null;

const EMERGENCY_CONFIG = {
  medical:   { label: 'Medical Emergency',   icon: Stethoscope, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',    msgType: 'emergency_medical' },
  transport: { label: 'Transport Emergency', icon: Car,         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30',  msgType: 'emergency_transport' },
  urgent:    { label: 'Urgent Emergency',    icon: Siren,       color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', msgType: 'emergency_urgent' },
};

const MAX_VOICE_SECONDS = 60;

export default function SendMessageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emergencyParam = searchParams.get('emergency') as EmergencyType;
  const { user, openQueues } = useUserStore();
  const { t, isLight } = useTheme();

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);
  const [content, setContent] = useState('');

  // Media attachment (optional)
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);

  // Voice note (mandatory)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

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
    } catch { toast.error('Could not load leaders'); }
  };

  // ─── Media attachment ────────────────────────────
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
    } else if (file.type.startsWith('video/')) { setMediaType('video'); setMediaPreview(null); }
    else if (file.type.startsWith('audio/')) { setMediaType('audio'); setMediaPreview(null); }
    else { setMediaType('document'); setMediaPreview(null); }
  };

  const removeMedia = () => {
    setMediaFile(null); setMediaPreview(null); setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Voice recording ─────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setVoiceBlob(blob);
        const f = new (window.File || Blob)([blob], 'voice.webm', { type: 'audio/webm' }) as File;
        setVoiceFile(f);
        if (previewAudioRef.current) {
          previewAudioRef.current.src = URL.createObjectURL(blob);
        } else {
          previewAudioRef.current = new Audio(URL.createObjectURL(blob));
          previewAudioRef.current.onended = () => setIsPlayingPreview(false);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setVoiceBlob(null);
      setVoiceFile(null);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t + 1 >= MAX_VOICE_SECONDS) {
            stopRecording();
            return MAX_VOICE_SECONDS;
          }
          return t + 1;
        });
      }, 1000);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const togglePreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) { previewAudioRef.current.pause(); setIsPlayingPreview(false); }
    else { previewAudioRef.current.play(); setIsPlayingPreview(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ─── Send ─────────────────────────────────────────
  const handleSend = async () => {
    if (!selectedLeader) { toast.error('Please select a leader'); return; }
    if (!content.trim()) { toast.error('Please write a message'); return; }
    if (!voiceFile && !isEmergency) { toast.error('Please record a voice note (mandatory)'); return; }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('telegram_id', user!.telegram_id);
      fd.append('leader_id', selectedLeader.id);
      fd.append('content', content.trim());
      fd.append('is_emergency', String(isEmergency));
      fd.append('message_type', isEmergency ? (emergencyConfig?.msgType || 'regular') : 'regular');
      if (mediaFile) { fd.append('media', mediaFile); fd.append('media_type', mediaType || 'document'); }
      if (voiceFile) fd.append('voice', voiceFile);

      const res = await fetch('/api/messages', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'already_sent') toast.error('You already sent a message in this queue.');
        else toast.error(data.message || 'Failed to send');
        return;
      }

      setSent(true);
      setTimeout(() => router.replace('/home'), 2200);
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setSending(false); }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--bg-primary)' }}>
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(76,175,120,0.1)', border: '2px solid rgba(76,175,120,0.4)' }}>
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Message Sent!</motion.h2>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Delivered to {selectedLeader?.display_name}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Returning to home...</motion.p>
      </div>
    );
  }

  return (
    <AppShell showNav={false}>
      <PageHeader title={isEmergency ? (emergencyConfig?.label || 'Emergency') : t('send.title')} showBack helpKey="send_message" />

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Emergency banner */}
        {isEmergency && emergencyConfig && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-2xl p-4 border flex items-center gap-3', emergencyConfig.bg)}>
            <emergencyConfig.icon className={cn('w-5 h-5 flex-shrink-0', emergencyConfig.color)} />
            <div>
              <p className={cn('text-sm font-semibold', emergencyConfig.color)}>{emergencyConfig.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bypasses queue — sent immediately</p>
            </div>
          </motion.div>
        )}

        {/* Leader selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('send.send_to')}</p>
          <button onClick={() => setShowLeaderPicker(!showLeaderPicker)}
            className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${showLeaderPicker ? 'var(--accent)' : 'var(--border-subtle)'}`,
            }}>
            {selectedLeader ? (
              <>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: 'var(--send-btn-bg)' }}>
                  {selectedLeader.display_name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedLeader.display_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isEmergency ? 'Emergency message' : openQueues.find(q => q.leader_id === selectedLeader.id) ? 'Queue open' : 'Emergency only'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm flex-1 text-left" style={{ color: 'var(--text-muted)' }}>{t('send.select_leader')}</p>
            )}
            <ChevronDown className={cn('w-4 h-4 transition-transform flex-shrink-0', showLeaderPicker && 'rotate-180')}
              style={{ color: 'var(--text-muted)' }} />
          </button>

          <AnimatePresence>
            {showLeaderPicker && (
              <motion.div initial={{ opacity: 0, y: -8, scaleY: 0.9 }} animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.9 }} transition={{ duration: 0.18 }}
                className="mt-1.5 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', transformOrigin: 'top' }}>
                {leaders.map((leader, i) => {
                  const hasOpenQueue = openQueues.some(q => q.leader_id === leader.id);
                  const canSelect = isEmergency || hasOpenQueue;
                  return (
                    <button key={leader.id} disabled={!canSelect}
                      onClick={() => { setSelectedLeader(leader); setShowLeaderPicker(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', opacity: canSelect ? 1 : 0.4, cursor: canSelect ? 'pointer' : 'not-allowed' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'var(--send-btn-bg)' }}>
                        {leader.display_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{leader.display_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {isEmergency ? 'Emergency' : hasOpenQueue ? '✓ Queue open' : 'Queue closed'}
                        </p>
                      </div>
                      {selectedLeader?.id === leader.id && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Text message */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('send.message')}</p>
          <div className="rounded-2xl overflow-hidden transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder={t('send.placeholder')}
              rows={5} maxLength={2000}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm outline-none resize-none"
              style={{ color: 'var(--text-primary)' }} />
            <div className="px-4 pb-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{content.length}/2000</span>
            </div>
          </div>
        </motion.div>

        {/* ─── MANDATORY VOICE NOTE ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>
              Voice Note
            </p>
            {!isEmergency && (
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold"
                style={{ background: 'var(--accent)' }}>Required</span>
            )}
          </div>

          {voiceBlob ? (
            /* Preview recorded audio */
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: `1px solid var(--accent)` }}>
              <div className="flex items-center gap-3">
                <button onClick={togglePreview}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: 'var(--send-btn-bg)' }}>
                  {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Voice note recorded</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(recordingTime)} • Tap play to preview</p>
                </div>
                <button onClick={() => { setVoiceBlob(null); setVoiceFile(null); setIsPlayingPreview(false); }}
                  className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
                  Re-record
                </button>
              </div>
            </div>
          ) : isRecording ? (
            /* Recording in progress */
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Recording... {fmt(recordingTime)}</p>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full bg-red-400 transition-all duration-1000"
                    style={{ width: `${(recordingTime / MAX_VOICE_SECONDS) * 100}%` }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Max 1 minute</p>
              </div>
              <button onClick={stopRecording}
                className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-[0_4px_16px_rgba(224,82,82,0.4)]">
                <StopCircle className="w-6 h-6" />
              </button>
            </div>
          ) : (
            /* Start recording */
            <button onClick={startRecording}
              className="w-full rounded-2xl py-5 flex flex-col items-center gap-3 transition-all active:scale-[0.98]"
              style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}>
                <Mic className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tap to Record Voice Note</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Max 1 minute · Required before sending</p>
              </div>
            </button>
          )}
        </motion.div>

        {/* Optional media attachment */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('send.attach')} <span style={{ color: 'var(--text-muted)', textTransform: 'lowercase', fontWeight: 400 }}>{t('send.optional')}</span>
          </p>

          {mediaFile ? (
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>
                  {mediaType === 'photo' ? <Image className="w-5 h-5" /> :
                   mediaType === 'video' ? <FileVideo className="w-5 h-5" /> :
                   mediaType === 'audio' ? <FileAudio className="w-5 h-5" /> : <File className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="preview" className="w-full max-h-32 object-cover rounded-xl" />
                  ) : (
                    <>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{mediaFile.name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{mediaType}</p>
                    </>
                  )}
                </div>
                <button onClick={removeMedia}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Image, label: 'Photo', accept: 'image/*' },
                { icon: FileVideo, label: 'Video', accept: 'video/*' },
                { icon: FileAudio, label: 'Audio', accept: 'audio/*' },
                { icon: File, label: 'Doc', accept: '*' },
              ].map(({ icon: Icon, label, accept }) => (
                <button key={label}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click(); } }}
                  className="rounded-xl py-3 flex flex-col items-center gap-1.5 transition-all active:scale-95"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                </button>
              ))}
            </div>
          )}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </motion.div>

        {/* Send Button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="pt-2">
          <button onClick={handleSend}
            disabled={sending || !selectedLeader || !content.trim() || (!voiceFile && !isEmergency)}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: isEmergency ? '#EF4444' : 'var(--send-btn-bg)', boxShadow: `0 4px 24px rgba(var(--accent-rgb),0.35)` }}>
            {sending
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Send className="w-4 h-4" />{isEmergency ? t('send.send_emergency') : t('send.send_btn')}</>
            }
          </button>
          {!isEmergency && !voiceFile && (
            <p className="text-center text-xs mt-2 flex items-center justify-center gap-1"
              style={{ color: 'var(--text-muted)' }}>
              <Mic className="w-3 h-3" /> Voice note required before sending
            </p>
          )}

        </motion.div>

      </div>
    </AppShell>
  );
}
