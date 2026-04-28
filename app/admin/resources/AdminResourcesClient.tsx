'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, FileAudio, FileText, Image, Video, Link2, CheckCircle2, X, Globe, Users } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

const FILE_TYPES = [
  { id: 'audio', label: 'Audio', icon: FileAudio, color: '#F5A623', accept: 'audio/*' },
  { id: 'pdf',   label: 'PDF',   icon: FileText,  color: '#E05252', accept: '.pdf' },
  { id: 'image', label: 'Image', icon: Image,     color: '#4A90D9', accept: 'image/*' },
  { id: 'video', label: 'Video', icon: Video,     color: '#9B5DE5', accept: 'video/*' },
  { id: 'link',  label: 'Link',  icon: Link2,     color: '#4CAF78', accept: '' },
];

export default function AdminResourcesClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const { isLight } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileType, setFileType] = useState('audio');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const groups = user?.groups || [];
  const selectedType = FILE_TYPES.find(t => t.id === fileType)!;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) { toast.error('File too large. Max 100MB.'); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
  };

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (fileType !== 'link' && !file) { toast.error('Please select a file'); return; }
    if (fileType === 'link' && !linkUrl.trim()) { toast.error('Please enter a URL'); return; }
    if (!isGlobal && !selectedGroupId) { toast.error('Please select a group'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('telegram_id', user!.telegram_id);
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      fd.append('file_type', fileType);
      fd.append('category', category.trim() || 'General');
      fd.append('is_global', String(isGlobal));
      if (!isGlobal) fd.append('group_id', selectedGroupId);
      if (fileType === 'link') fd.append('link_url', linkUrl.trim());
      if (file) fd.append('file', file);

      const res = await fetch('/api/resources', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUploaded(true);
      setTimeout(() => {
        setUploaded(false);
        setTitle(''); setDescription(''); setFile(null); setLinkUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
      toast.success('Resource uploaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell showNav={false}>
      <PageHeader title="Upload Resource" subtitle="Add files for users" showBack />
      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* File type selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>File Type</p>
          <div className="grid grid-cols-5 gap-2">
            {FILE_TYPES.map(type => (
              <button key={type.id} onClick={() => setFileType(type.id)}
                className="rounded-xl py-3 flex flex-col items-center gap-1.5 transition-all"
                style={{
                  background: fileType === type.id ? `${type.color}20` : 'var(--bg-card)',
                  border: `1px solid ${fileType === type.id ? type.color : 'var(--border-subtle)'}`,
                }}>
                <type.icon className="w-4 h-4" style={{ color: fileType === type.id ? type.color : 'var(--text-muted)' }} />
                <span className="text-[9px] font-medium" style={{ color: fileType === type.id ? type.color : 'var(--text-muted)' }}>{type.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title..."
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Description <span className="normal-case font-normal">(optional)</span>
          </p>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..."
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
        </motion.div>

        {/* Category */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Category</p>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Spiritual, Training, Announcements"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
        </motion.div>

        {/* File upload or link input */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          {fileType === 'link' ? (
            <>
              <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>URL</p>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                type="url"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>File</p>
              {file ? (
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'var(--bg-card)', border: `1px solid ${selectedType.color}` }}>
                  <selectedType.icon className="w-5 h-5 flex-shrink-0" style={{ color: selectedType.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = selectedType.accept; fileInputRef.current.click(); } }}
                  className="w-full rounded-2xl py-8 flex flex-col items-center gap-3 transition-all active:scale-[0.98]"
                  style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${selectedType.color}15` }}>
                    <Upload className="w-6 h-6" style={{ color: selectedType.color }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tap to select {selectedType.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Max 100MB</p>
                  </div>
                </button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            </>
          )}
        </motion.div>

        {/* Visibility */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Visibility</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setIsGlobal(true)}
              className="rounded-xl p-3 flex items-center gap-2 transition-all"
              style={{ background: isGlobal ? 'var(--send-btn-bg)' : 'var(--bg-card)', border: `1px solid ${isGlobal ? 'transparent' : 'var(--border-subtle)'}` }}>
              <Globe className="w-4 h-4" style={{ color: isGlobal ? 'white' : 'var(--text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: isGlobal ? 'white' : 'var(--text-primary)' }}>All Users</span>
            </button>
            <button onClick={() => setIsGlobal(false)}
              className="rounded-xl p-3 flex items-center gap-2 transition-all"
              style={{ background: !isGlobal ? 'var(--send-btn-bg)' : 'var(--bg-card)', border: `1px solid ${!isGlobal ? 'transparent' : 'var(--border-subtle)'}` }}>
              <Users className="w-4 h-4" style={{ color: !isGlobal ? 'white' : 'var(--text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: !isGlobal ? 'white' : 'var(--text-primary)' }}>Group Only</span>
            </button>
          </div>
          {!isGlobal && groups.length > 0 && (
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full rounded-xl px-3 py-3 text-sm outline-none mt-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: selectedGroupId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              <option value="">Select group...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </motion.div>

        {/* Upload button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button onClick={handleUpload}
            disabled={uploading || uploaded}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-70"
            style={{ background: uploaded ? '#4CAF78' : 'var(--send-btn-bg)', boxShadow: `0 4px 24px rgba(var(--accent-rgb),0.35)` }}>
            {uploading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : uploaded
              ? <><CheckCircle2 className="w-4 h-4" /> Uploaded!</>
              : <><Upload className="w-4 h-4" /> Upload Resource</>
            }
          </button>
        </motion.div>

      </div>
    </AppShell>
  );
}
