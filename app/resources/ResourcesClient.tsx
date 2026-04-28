'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileAudio, FileText, Image, Video, Link2,
  Download, Play, Pause, ExternalLink,
  ChevronDown, ChevronUp, Folder, Volume2,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Resource {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type: 'audio' | 'pdf' | 'image' | 'video' | 'link';
  link_url?: string;
  category: string;
  is_global: boolean;
  file_size_kb?: number;
  duration_seconds?: number;
  created_at: string;
  groups?: { name: string };
  users?: { name: string; role: string };
}

const FILE_ICONS = {
  audio:  { icon: FileAudio, color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
  pdf:    { icon: FileText,  color: '#E05252', bg: 'rgba(224,82,82,0.1)' },
  image:  { icon: Image,     color: '#4A90D9', bg: 'rgba(74,144,217,0.1)' },
  video:  { icon: Video,     color: '#9B5DE5', bg: 'rgba(155,93,229,0.1)' },
  link:   { icon: Link2,     color: '#4CAF78', bg: 'rgba(76,175,120,0.1)' },
};

export default function ResourcesClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { isLight } = useTheme();
  const [byCategory, setByCategory] = useState<Record<string, Resource[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchResources = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/resources?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setByCategory(data.byCategory || {});
      // Auto-expand all categories on first load
      if (Object.keys(data.byCategory || {}).length > 0 && expandedCategories.size === 0) {
        setExpandedCategories(new Set(Object.keys(data.byCategory)));
      }
    } catch { /* silently */ }
    finally { setLoading(false); }
  };

  usePolling(fetchResources, [user?.telegram_id], { interval: 30000, enabled: !!user });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleDownload = (resource: Resource) => {
    if (resource.file_type === 'link') {
      window.open(resource.link_url, '_blank');
      return;
    }
    if (!resource.file_url) return;

    const extMap: Record<string, string> = {
      audio: 'mp3', pdf: 'pdf', image: 'jpg', video: 'mp4',
    };
    const ext = extMap[resource.file_type] || 'bin';
    const filename = `${resource.title.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    const proxyUrl = `/api/download?url=${encodeURIComponent(resource.file_url)}&filename=${encodeURIComponent(filename)}&type=${resource.file_type}`;

    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download started');
  };

  const totalResources = Object.values(byCategory).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return (
      <AppShell showNav={false}>
        <PageHeader title="Resources" showBack />
        <div className="px-4 space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="rounded-2xl p-4 animate-pulse h-20"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNav={false}>
      <PageHeader title="Resources" subtitle={`${totalResources} files available`} showBack />

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-3">

        {totalResources === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <Folder className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No resources yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Resources will appear here when uploaded by your admin or leader.</p>
          </motion.div>
        ) : (
          Object.entries(byCategory).map(([category, resources], catIndex) => (
            <motion.div key={category}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.06 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

              {/* Category header */}
              <button onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-3 px-4 py-4"
                style={{ borderBottom: expandedCategories.has(category) ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}>
                  <Folder className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{category}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{resources.length} file{resources.length !== 1 ? 's' : ''}</p>
                </div>
                {expandedCategories.has(category)
                  ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
              </button>

              {/* Resources list */}
              <AnimatePresence>
                {expandedCategories.has(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden">
                    {resources.map((resource, i) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        isLast={i === resources.length - 1}
                        isPlaying={playingId === resource.id}
                        onPlay={() => setPlayingId(playingId === resource.id ? null : resource.id)}
                        onDownload={() => handleDownload(resource)}
                        isLight={isLight}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </AppShell>
  );
}

function ResourceCard({ resource, isLast, isPlaying, onPlay, onDownload, isLight }: {
  resource: Resource;
  isLast: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
  isLight: boolean;
}) {
  const fileConfig = FILE_ICONS[resource.file_type];
  const Icon = fileConfig.icon;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Setup audio element for audio files
  const setupAudio = () => {
    if (resource.file_type !== 'audio' || !resource.file_url) return;
    if (!audioRef.current) {
      const audio = new Audio(resource.file_url);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
      audio.onended = () => { onPlay(); setProgress(0); };
      audioRef.current = audio;
    }
  };

  const handlePlay = () => {
    setupAudio();
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => toast.error('Could not play audio')); }
    onPlay();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const fmtSize = (kb?: number) => !kb ? '' : kb > 1024 ? `${(kb/1024).toFixed(1)} MB` : `${kb} KB`;

  return (
    <div className={cn('px-4 py-3.5', !isLast && 'border-b')}
      style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: fileConfig.bg, color: fileConfig.color }}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{resource.title}</p>
          {resource.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{resource.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] uppercase font-medium" style={{ color: fileConfig.color }}>
              {resource.file_type}
            </span>
            {resource.file_size_kb && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtSize(resource.file_size_kb)}</span>
            )}
            {resource.duration_seconds && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmt(resource.duration_seconds)}</span>
            )}
            {!resource.is_global && resource.groups && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>
                {resource.groups.name}
              </span>
            )}
          </div>

          {/* Audio player inline */}
          {resource.file_type === 'audio' && resource.file_url && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: fileConfig.color }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{duration > 0 ? fmt(duration) : '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {/* Play/Open button */}
          {resource.file_type === 'audio' && resource.file_url && (
            <button onClick={handlePlay}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: fileConfig.bg, color: fileConfig.color }}>
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          )}
          {resource.file_type === 'pdf' && resource.file_url && (
            <button onClick={() => window.open(resource.file_url, '_blank')}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: fileConfig.bg, color: fileConfig.color }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {resource.file_type === 'image' && resource.file_url && (
            <button onClick={() => window.open(resource.file_url, '_blank')}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: fileConfig.bg, color: fileConfig.color }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {resource.file_type === 'video' && resource.file_url && (
            <button onClick={() => window.open(resource.file_url, '_blank')}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: fileConfig.bg, color: fileConfig.color }}>
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {resource.file_type === 'link' && (
            <button onClick={() => window.open(resource.link_url, '_blank')}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: fileConfig.bg, color: fileConfig.color }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download button (not for links) */}
          {resource.file_type !== 'link' && resource.file_url && (
            <button onClick={onDownload}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
